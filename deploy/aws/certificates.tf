resource "aws_acm_certificate" "cloudfront" {
  provider = aws.us_east_1

  domain_name               = var.domain_name
  subject_alternative_names = ["*.${var.domain_name}"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

# ACM returns the same validation token for an apex and its wildcard. One DNS
# record therefore validates both names and avoids duplicate Route53 records.
locals {
  cloudfront_apex_validation = one([
    for option in aws_acm_certificate.cloudfront.domain_validation_options : option
    if option.domain_name == var.domain_name
  ])
}

resource "aws_route53_record" "certificate_validation" {
  zone_id = var.route53_zone_id
  name    = local.cloudfront_apex_validation.resource_record_name
  type    = local.cloudfront_apex_validation.resource_record_type
  records = [local.cloudfront_apex_validation.resource_record_value]
  ttl     = 300
}

resource "aws_acm_certificate_validation" "cloudfront" {
  provider = aws.us_east_1

  certificate_arn         = aws_acm_certificate.cloudfront.arn
  validation_record_fqdns = [aws_route53_record.certificate_validation.fqdn]
}

resource "aws_acm_certificate" "alb" {
  count = var.aws_region == "us-east-1" ? 0 : 1

  domain_name               = var.domain_name
  subject_alternative_names = ["*.${var.domain_name}"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

# ACM validation tokens are reusable for the same account/domain across
# regions, so the us-east-1 record also validates the regional ALB certificate.
resource "aws_acm_certificate_validation" "alb" {
  count = var.aws_region == "us-east-1" ? 0 : 1

  certificate_arn         = aws_acm_certificate.alb[0].arn
  validation_record_fqdns = [aws_route53_record.certificate_validation.fqdn]
}

locals {
  alb_certificate_arn = var.aws_region == "us-east-1" ? aws_acm_certificate.cloudfront.arn : aws_acm_certificate.alb[0].arn
}

resource "aws_route53_record" "apex" {
  zone_id = var.route53_zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.main.domain_name
    zone_id                = aws_cloudfront_distribution.main.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "wildcard" {
  zone_id = var.route53_zone_id
  name    = "*.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.main.domain_name
    zone_id                = aws_cloudfront_distribution.main.hosted_zone_id
    evaluate_target_health = false
  }
}


resource "aws_route53_record" "apex_ipv6" {
  zone_id = var.route53_zone_id
  name    = var.domain_name
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.main.domain_name
    zone_id                = aws_cloudfront_distribution.main.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "wildcard_ipv6" {
  zone_id = var.route53_zone_id
  name    = "*.${var.domain_name}"
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.main.domain_name
    zone_id                = aws_cloudfront_distribution.main.hosted_zone_id
    evaluate_target_health = false
  }
}