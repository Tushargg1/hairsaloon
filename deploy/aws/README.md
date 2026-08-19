# Phase 10 AWS Terraform (reviewed configuration only)

> **Reviewed configuration only:** `terraform init`, `plan`, and `apply` were deliberately not run.

This directory is intentionally reviewable infrastructure-as-code, not evidence of a deployed environment. No initialization, planning, apply, publish, deployment, or AWS/network call is part of this change. Review provider lock selections during a later controlled `terraform init`; commit the generated lock file after review.

## What it defines

- Existing VPC integration with supplied public/private subnet IDs; no VPC, NAT gateway, or endpoints are created.
- Immutable/scanned ECR repository and an ECS/Fargate service behind a public ALB.
- PostgreSQL 16 RDS with encrypted storage, an RDS-managed master password, backups, final snapshot, deletion protection, and destroy prevention.
- Redis 7 replication group with TLS, at-rest encryption, auth, snapshots, and optional Multi-AZ failover.
- Private/versioned S3 SPA bucket, CloudFront Origin Access Control (OAC), and one distribution serving the apex and wildcard.
- A separate private/versioned and encrypted S3 media bucket, restrictive browser upload CORS, version-retention lifecycle rules, and a dedicated OAC-protected CloudFront distribution.
- An ECS task-role policy limited to listing and managing objects under the configured `salons/*` media prefix; the task receives the S3 bucket, region, provider, and CDN base URL as environment variables.
- Route53 apex/wildcard aliases, us-east-1 CloudFront certificate, and regional ALB certificate, each covering apex and wildcard.
- CloudWatch logs, ECS Container Insights, rolling deployments, and automatic circuit-breaker rollback.

## Prerequisites

1. An AWS account/role allowed to manage the declared services, pass the ECS roles, validate ACM certificates, and resolve the Redis secret while creating the nested CloudFormation stack.
2. Terraform in the declared version range and AWS provider `~> 5.0` selected by a reviewed lock file.
3. An existing VPC with at least two public and two private subnets in distinct Availability Zones. Public subnets need Internet Gateway routing. Private subnets need NAT egress or appropriate VPC endpoints for ECR API/DKR, S3, CloudWatch Logs, Secrets Manager, and KMS; NAT is also needed when Resend is enabled.
4. A public Route53 hosted zone for the apex domain. Existing apex/wildcard records must be reconciled before apply.
5. Existing Secrets Manager secrets:
   - JWT secret: the entire SecretString is the signing secret.
   - Redis auth secret: the entire SecretString is a Redis-compatible token (16–128 printable characters and no prohibited characters). Do not use JSON for this secret.
   - Optional Resend secret: the entire SecretString is the API key.
   Existing customer-managed KMS keys must be listed by ARN so the ECS execution role can decrypt them. The deployment principal/CloudFormation execution context also needs access to the Redis secret and its KMS key.
6. A reviewed remote encrypted Terraform backend with locking. It is intentionally not configured here because backend coordinates are environment-specific.

Copy `terraform.tfvars.example` to an untracked input file and replace placeholders with identifiers/ARNs only. Never place secret values in Terraform variables, tfvars, CLI arguments, outputs, or source control.

## Secret handling

RDS generates and manages its master password in Secrets Manager. ECS reads `username` and `password` JSON keys from the RDS-managed secret and reads JWT/Redis/optional Resend values as task-definition secret references. The Redis resource is intentionally hosted in a narrowly scoped `aws_cloudformation_stack`: a Secrets Manager dynamic reference lets the service resolve the auth token without Terraform reading or storing its plaintext. A secret value change alone does not update the replication group; Redis token rotation needs a reviewed dual-token/rotation procedure and an explicit stack update before tasks switch tokens.

## First rollout and database migrations

The service image references the ECR repository created by this stack, so bootstrap in controlled stages: create/review the repository first, build and scan the backend image in CI, push it under the immutable configured tag, then continue the reviewed apply. Never use `latest`.

Flyway is enabled and runs migrations when the application starts. For the first rollout or any non-backward-compatible migration, run the same image as a one-off Fargate migration task with service desired count held at zero, inspect its logs, then deploy the service. For backward-compatible migrations, the startup migration can be used, but concurrent task startup must be reviewed and migrations must remain idempotent/lock-safe. Take or verify a restorable RDS snapshot before destructive schema changes.

## Frontend upload and caching

Build the SPA outside Terraform and upload files directly to the private bucket using an authorized CI role. Suggested metadata:

- content-hashed files under `/assets/`: `Cache-Control: public,max-age=31536000,immutable` and correct `Content-Type`/`Content-Encoding`;
- `index.html`, manifests, and service-worker files: `Cache-Control: no-cache,max-age=0,must-revalidate`;
- other non-hashed files: short explicit cache lifetimes.

The `/assets/*` behavior enforces a long cache. The default behavior honors origin metadata with a one-hour default. A viewer-request function rewrites only extensionless default-behavior routes to `/index.html`; API responses retain their real status. Invalidate `/index.html` (or the minimal changed paths), not the immutable asset tree, after upload.

## Salon media storage

Salon media is isolated from SPA deployment assets in a separate S3 bucket. The bucket has Bucket Owner Enforced ownership, all four public-access blocks, AES-256 default encryption, versioning, and an HTTPS-only bucket policy. CloudFront is the only public reader and may fetch only `${media_object_prefix}/*` objects through its dedicated OAC distribution; the distribution uses its generated `cloudfront.net` HTTPS hostname, exposed as `media_cdn_base_url`.

The ECS task role can list only the configured prefix and can get, put, delete, and manage multipart uploads only below it. Keep the default `media_object_prefix = "salons"` and structure keys as `salons/<salon-id>/<opaque-object-name>` so one salon's namespace can be enforced in application-generated keys or presigned requests. The policy does not grant access outside `salons/*`, bucket administration, ACL changes, policy changes, or public access.

Browser uploads should use short-lived presigned S3 POST/PUT requests generated by the application. Bucket CORS accepts only `POST` and `PUT` from the production apex and HTTPS tenant subdomains and only the declared signing/content headers; reads should use the CDN URL, not S3. If uploads need an additional trusted management origin or header, add it explicitly rather than using `*`. Incomplete multipart uploads are aborted after seven days by default. Noncurrent versions move to Standard-IA after 30 days and expire after 365 days by default; current objects are not expired automatically. Review retention, recovery, privacy deletion, and storage cost requirements before apply.

The task definition sets `MEDIA_STORAGE_PROVIDER=s3`, `MEDIA_S3_BUCKET`, `MEDIA_CDN_BASE_URL`, `MEDIA_S3_REGION`, and `MEDIA_OBJECT_PREFIX`. The CloudFront hostname is assigned during creation, so expect a new task-definition revision after the distribution is created. Upload keys must remain beneath `media_object_prefix`; the prefix is configurable via the `media_object_prefix` Terraform variable (default `salons`) and is passed to the application at runtime.

## Host, cookies, CORS, and TLS

CloudFront redirects viewers to HTTPS and uses TLS 1.2+ at the edge. `/api/*` is never cached and forwards the viewer `Host`, all cookies, all query strings, and `Authorization`, `Content-Type`, and `Origin` to the ALB. Forwarding `Host` preserves apex/tenant routing and lets the application scope its secure cookie to `.<apex>`. The backend permits the apex origin plus HTTPS wildcard subdomains; verify credentialed CORS behavior in a browser before launch. The ALB has HTTP-to-HTTPS redirect and a modern TLS policy; CloudFront connects to it over TLS using the viewer host, so the ALB certificate covers both apex and wildcard.

The ALB is public and its security group permits public 443 because no environment-specific CloudFront origin-facing prefix-list ID or private origin mechanism was supplied. This means a knowledgeable client can bypass CloudFront by resolving the ALB and presenting a covered host. Before production, restrict ALB ingress to the AWS-managed CloudFront origin-facing prefix list and/or add a rotated secret origin-header listener rule without putting that secret in Terraform state. CloudFront itself already redirects viewer HTTP, while the ALB port 80 listener satisfies direct redirect behavior.

## Rollout and rollback

Use immutable image tags. Review a saved plan, apply through CI, watch ECS deployment events, target health, application logs, and ALB 5xx/latency. The ECS rolling deployment keeps 100% healthy capacity and may surge to 200%; confirm subnet IP and account capacity. The deployment circuit breaker rolls back a failed task deployment automatically. For an application rollback, restore the previous immutable image tag and apply a new task revision. Database rollback should normally use a forward corrective migration; snapshot restore is a disaster-recovery action and creates a new endpoint.

## Backups, monitoring, security, and cost

RDS retains automated backups for 14 days by default, preserves automated backups on deletion, requires a final snapshot, enables PostgreSQL/upgrade logs and Performance Insights, and cannot be destroyed until both Terraform destroy prevention and AWS deletion protection are deliberately reviewed and changed. Redis retains seven days of snapshots and snapshots on replacement/deletion through its nested stack. Regularly test restore procedures and define cross-region/account backup policy externally if required.

Create alarms for ALB 4xx/5xx/latency and unhealthy hosts, ECS running-task shortfall/CPU/memory/deployment failures, RDS CPU/storage/connections/replica or backup failures, Redis memory/evictions/CPU/replication lag, CloudFront error rate, and billing. Logs may contain sensitive request/application data; keep structured logging redacted and tune retention.

Default sizes favor a small deployment, not guaranteed production availability: RDS Multi-AZ defaults off while Redis defaults to two nodes. Review Multi-AZ, desired count, capacity, backup retention, media version retention, CloudFront price class, log ingestion, NAT gateway/data processing, RDS Performance Insights, and snapshot/storage costs. Add WAF, Shield posture, access logs with a dedicated log bucket, budgets, secret rotation, KMS/customer key policy, ECR signing/provenance, and least-privilege CI roles according to the threat model. Both S3 buckets are private: CloudFront reads frontend assets and salon-prefixed media through separate OACs, while ECS receives only the media object permissions documented above.