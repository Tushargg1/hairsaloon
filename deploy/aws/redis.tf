resource "aws_elasticache_subnet_group" "main" {
  name = "${local.name}-redis"

  subnet_ids = var.private_subnet_ids

  tags = { Name = "${local.name}-redis" }
}

# The AWS provider's ElastiCache auth_token argument would place the token in
# Terraform state. This narrowly scoped stack lets CloudFormation resolve the
# existing Secrets Manager value directly, while Terraform stores only its ARN.
resource "aws_cloudformation_stack" "redis" {
  name = "${local.name}-redis"

  template_body = jsonencode({
    AWSTemplateFormatVersion = "2010-09-09"
    Description              = "Encrypted Redis 7 replication group for ${local.name}"
    Resources = {
      ReplicationGroup = {
        Type = "AWS::ElastiCache::ReplicationGroup"
        DeletionPolicy = "Snapshot"
        UpdateReplacePolicy = "Snapshot"
        Properties = {
          ReplicationGroupDescription = "${local.name} Redis"
          ReplicationGroupId          = "${local.name}-redis"
          Engine                      = "redis"
          EngineVersion               = "7.1"
          CacheNodeType               = var.redis_node_type
          NumCacheClusters            = var.redis_num_cache_clusters
          AutomaticFailoverEnabled    = var.redis_num_cache_clusters > 1
          MultiAZEnabled               = var.redis_num_cache_clusters > 1
          CacheSubnetGroupName        = aws_elasticache_subnet_group.main.name
          SecurityGroupIds            = [aws_security_group.redis.id]
          AtRestEncryptionEnabled     = true
          TransitEncryptionEnabled    = true
          TransitEncryptionMode       = "required"
          AuthToken                   = "{{resolve:secretsmanager:${var.redis_auth_secret_arn}:SecretString}}"
          SnapshotRetentionLimit      = var.redis_snapshot_retention_days
          SnapshotWindow              = "02:00-03:00"
          PreferredMaintenanceWindow  = "sun:03:30-sun:04:30"
          AutoMinorVersionUpgrade     = true
          Port                        = 6379
          Tags = [
            for key, value in local.common_tags : {
              Key   = key
              Value = value
            }
          ]
        }
      }
    }
    Outputs = {
      PrimaryEndpoint = {
        Value = { "Fn::GetAtt" = ["ReplicationGroup", "PrimaryEndPoint.Address"] }
      }
      Port = {
        Value = { "Fn::GetAtt" = ["ReplicationGroup", "PrimaryEndPoint.Port"] }
      }
    }
  })

  tags = { Name = "${local.name}-redis" }
}