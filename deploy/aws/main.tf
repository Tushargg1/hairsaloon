locals {
  name = "${var.project_name}-${var.environment}"

  common_tags = merge({
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
    Phase       = "10"
  }, var.tags)

  secret_arns = compact([
    var.jwt_secret_arn,
    var.redis_auth_secret_arn,
    var.resend_secret_arn,
    aws_db_instance.main.master_user_secret[0].secret_arn,
  ])

  app_secrets = concat([
    {
      name      = "JWT_SECRET"
      valueFrom = var.jwt_secret_arn
    },
    {
      name      = "REDIS_PASSWORD"
      valueFrom = var.redis_auth_secret_arn
    },
    {
      name      = "POSTGRES_USER"
      valueFrom = "${aws_db_instance.main.master_user_secret[0].secret_arn}:username::"
    },
    {
      name      = "POSTGRES_PASSWORD"
      valueFrom = "${aws_db_instance.main.master_user_secret[0].secret_arn}:password::"
    }
  ], var.resend_secret_arn == null ? [] : [{
    name      = "RESEND_API_KEY"
    valueFrom = var.resend_secret_arn
  }])
}