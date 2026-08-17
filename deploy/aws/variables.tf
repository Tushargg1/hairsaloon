variable "aws_region" {
  description = "AWS region for regional resources."
  type        = string
}

variable "project_name" {
  description = "Short lowercase name used in resource names."
  type        = string
  default     = "hairsaloon"
  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.project_name))
    error_message = "project_name may contain lowercase letters, digits, and hyphens only."
  }
}

variable "environment" {
  description = "Deployment environment name."
  type        = string
  default     = "prod"
}

variable "domain_name" {
  description = "Apex DNS name, without a scheme or trailing dot."
  type        = string
  validation {
    condition     = !startswith(var.domain_name, "*.") && !can(regex("/$", var.domain_name))
    error_message = "domain_name must be an apex name without a wildcard or trailing slash."
  }
}

variable "route53_zone_id" {
  description = "Existing public Route53 hosted zone ID for domain_name."
  type        = string
}

variable "vpc_id" {
  description = "Existing VPC ID."
  type        = string
}

variable "public_subnet_ids" {
  description = "At least two existing public subnet IDs in distinct AZs for the ALB."
  type        = list(string)
  validation {
    condition     = length(var.public_subnet_ids) >= 2
    error_message = "At least two public subnet IDs are required."
  }
}

variable "private_subnet_ids" {
  description = "At least two existing private subnet IDs in distinct AZs for ECS, RDS, and Redis."
  type        = list(string)
  validation {
    condition     = length(var.private_subnet_ids) >= 2
    error_message = "At least two private subnet IDs are required."
  }
}

variable "container_image_tag" {
  description = "Immutable backend image tag already pushed to the ECR repository."
  type        = string
  default     = "release-placeholder"
}

variable "ecs_desired_count" {
  description = "Desired backend task count."
  type        = number
  default     = 2
  validation {
    condition     = var.ecs_desired_count >= 1
    error_message = "ecs_desired_count must be at least 1."
  }
}

variable "ecs_cpu" {
  description = "Fargate task CPU units."
  type        = number
  default     = 512
}

variable "ecs_memory" {
  description = "Fargate task memory in MiB."
  type        = number
  default     = 1024
}

variable "frontend_bucket_name" {
  description = "Optional globally unique frontend bucket name; null lets AWS generate one."
  type        = string
  default     = null
  nullable    = true
}

variable "jwt_secret_arn" {
  description = "Existing Secrets Manager ARN whose entire SecretString is the JWT signing secret."
  type        = string
}

variable "redis_auth_secret_arn" {
  description = "Existing Secrets Manager ARN whose entire SecretString is the Redis auth token."
  type        = string
}

variable "resend_secret_arn" {
  description = "Optional existing Secrets Manager ARN whose entire SecretString is the Resend API key."
  type        = string
  default     = null
  nullable    = true
}

variable "secret_kms_key_arns" {
  description = "Customer-managed KMS key ARNs needed to decrypt supplied secrets, if any."
  type        = list(string)
  default     = []
}

variable "email_from" {
  description = "Verified sender address used when resend_secret_arn is set."
  type        = string
  default     = ""
}

variable "db_name" {
  description = "Initial PostgreSQL database name."
  type        = string
  default     = "hairsaloon"
}

variable "db_master_username" {
  description = "RDS master username; its password is generated and managed by RDS."
  type        = string
  default     = "hairsaloon_admin"
}

variable "db_instance_class" {
  description = "RDS instance class; the default supports the enabled Performance Insights setting."
  type        = string
  default     = "db.t4g.small"
}

variable "db_allocated_storage" {
  description = "Initial RDS gp3 storage in GiB."
  type        = number
  default     = 20
}

variable "db_max_allocated_storage" {
  description = "RDS storage autoscaling ceiling in GiB."
  type        = number
  default     = 100
}

variable "db_multi_az" {
  description = "Enable RDS Multi-AZ; recommended for production and increases cost."
  type        = bool
  default     = false
}

variable "db_backup_retention_days" {
  description = "RDS automated backup retention."
  type        = number
  default     = 14
}

variable "redis_node_type" {
  description = "ElastiCache node type."
  type        = string
  default     = "cache.t4g.micro"
}

variable "redis_num_cache_clusters" {
  description = "Redis nodes; use at least 2 for automatic failover."
  type        = number
  default     = 2
  validation {
    condition     = var.redis_num_cache_clusters >= 1
    error_message = "redis_num_cache_clusters must be at least 1."
  }
}

variable "redis_snapshot_retention_days" {
  description = "ElastiCache automatic snapshot retention."
  type        = number
  default     = 7
}

variable "log_retention_days" {
  description = "CloudWatch log retention."
  type        = number
  default     = 30
}

variable "tags" {
  description = "Additional tags applied through provider default tags."
  type        = map(string)
  default     = {}
}