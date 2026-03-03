terraform {
  required_version = ">= 1.9.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
  }

  backend "s3" {
    bucket         = "my-tf-stack-bucket-foyez"
    key            = "eks-microservices/terraform.tfstate"
    region         = "eu-central-1"
    encrypt        = true
    dynamodb_table = "tf-state-lock"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "EKS-Microservices"
      ManagedBy   = "Terraform"
      Environment = var.environment
    }
  }
}

# Get EKS cluster info for Kubernetes provider
data "aws_eks_cluster_auth" "cluster" {
  name = module.eks.cluster_name
}

