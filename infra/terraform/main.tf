provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  description = "The AWS region to deploy to"
  default     = "us-east-1"
}

variable "project_name" {
  description = "The name of the project"
  default     = "saas-starter-kit"
}

variable "environment" {
  description = "Environment name (e.g., prod, staging)"
  default     = "prod"
}

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}
