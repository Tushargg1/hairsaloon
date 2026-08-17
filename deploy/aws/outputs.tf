output "ecr_repository_url" {
  value = aws_ecr_repository.backend.repository_url
}

output "frontend_bucket_name" {
  value = aws_s3_bucket.frontend.id
}

output "cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.main.id
}

output "cloudfront_domain_name" {
  value = aws_cloudfront_distribution.main.domain_name
}

output "application_urls" {
  value = [
    "https://${var.domain_name}",
    "https://*.${var.domain_name}",
  ]
}

output "alb_dns_name" {
  value = aws_lb.main.dns_name
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  value = aws_ecs_service.backend.name
}

output "rds_endpoint" {
  value     = aws_db_instance.main.endpoint
  sensitive = true
}

output "rds_master_secret_arn" {
  value     = aws_db_instance.main.master_user_secret[0].secret_arn
  sensitive = true
}

output "redis_primary_endpoint" {
  value     = aws_cloudformation_stack.redis.outputs["PrimaryEndpoint"]
  sensitive = true
}