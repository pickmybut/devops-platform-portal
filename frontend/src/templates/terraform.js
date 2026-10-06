/** Terraform — files in devops/terraform/ */

export function buildTerraformFiles({ projectName, appName, description, infra }) {
  const infraId  = infra?.id ?? 'none';
  const resource = infraResourceBlock(projectName, appName, infraId);

  return [
    {
      path: 'devops/terraform/versions.tf',
      content: `terraform {
  required_version = ">= 1.9"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Uncomment to use S3 remote state:
  # backend "s3" {
  #   bucket = "my-terraform-state"
  #   key    = "${appName}/terraform.tfstate"
  #   region = "eu-west-2"
  # }
}

provider "aws" {
  region = var.aws_region
}
`,
    },
    {
      path: 'devops/terraform/variables.tf',
      content: `variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "eu-west-2"
}

variable "environment" {
  description = "Deployment environment (dev / staging / prod)"
  type        = string
}

variable "project_name" {
  description = "Short name for resource naming"
  type        = string
  default     = "${projectName}"
}
`,
    },
    {
      path: 'devops/terraform/main.tf',
      content: `# ── ${projectName} — Terraform ──────────────────────────────────────────────
# ${description || ''}

${resource}
`,
    },
    {
      path: 'devops/terraform/outputs.tf',
      content: `output "project_name" {
  description = "Project name"
  value       = var.project_name
}

output "environment" {
  description = "Deployment environment"
  value       = var.environment
}
`,
    },
    {
      path: 'devops/terraform/terraform.tfvars.example',
      content: `aws_region   = "eu-west-2"\nenvironment  = "dev"\nproject_name = "${projectName}"\n`,
    },
    { path: 'devops/terraform/.gitignore', content: `.terraform/\n*.tfstate\n*.tfstate.backup\n*.tfvars\n!*.tfvars.example\n.terraform.lock.hcl\n*.log\n.DS_Store\n` },
    {
      path: 'devops/terraform/README.md',
      content: `# ${projectName} — Terraform\n\n${description || ''}\n\n\`\`\`bash\ncd devops/terraform\ncp terraform.tfvars.example terraform.tfvars\n# Edit terraform.tfvars\nterraform init\nterraform plan\nterraform apply\n\`\`\`\n`,
    },
  ];
}

function infraResourceBlock(name, slug, infraId) {
  if (infraId === 'ecs-fargate' || infraId === 'ecs-ec2') return `resource "aws_ecs_cluster" "main" {\n  name = "\${var.project_name}-\${var.environment}"\n  tags = { Project = var.project_name, Environment = var.environment }\n}`;
  if (infraId === 'lambda') return `resource "aws_lambda_function" "main" {\n  function_name = "\${var.project_name}-\${var.environment}"\n  role          = aws_iam_role.lambda.arn\n  handler       = "handler.lambda_handler"\n  runtime       = "python3.14"\n  filename      = "function.zip"\n}`;
  if (infraId === 's3-cloudfront') return `resource "aws_s3_bucket" "site" {\n  bucket = "\${var.project_name}-\${var.environment}-site"\n  tags   = { Project = var.project_name, Environment = var.environment }\n}`;
  return `# Add your AWS resources here\n# See https://registry.terraform.io/providers/hashicorp/aws/latest/docs`;
}

export const TERRAFORM_PREVIEW_VARS = { projectName: 'my-project', appName: 'my_project', pascalName: 'MyProject', description: 'Terraform infrastructure', infra: null };
export const TERRAFORM_META = { id: 'terraform', label: 'Terraform', description: 'HashiCorp Terraform · AWS Provider · devops/terraform/', fileCount: 7 };
