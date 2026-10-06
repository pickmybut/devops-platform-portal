/**
 * Python CDK IaC scaffold template.
 * All files live under devops/cdk/ in the project root.
 *
 * Call buildPythonCdkFiles({ projectName, appName, pascalName, infra, projectType }) to get the
 * full file list.  When infra is provided, main_stack.py is generated with
 * architecture-specific CDK constructs (ECS Fargate, Lambda, S3+CF, etc.).
 */

// ── cdk.json context flags (mirrors the Radius standard cdk.json) ─────────────
const CDK_JSON = {
  app: 'python3 app.py',
  watch: {
    include: ['**'],
    exclude: [
      'README.md',
      'cdk*.json',
      'requirements*.txt',
      'source.bat',
      '**/__init__.py',
      '**/__pycache__',
      'tests',
    ],
  },
  context: {
    '@aws-cdk/aws-signer:signingProfileNamePassedToCfn': true,
    '@aws-cdk/aws-ecs-patterns:secGroupsDisablesImplicitOpenListener': true,
    '@aws-cdk/aws-lambda:recognizeLayerVersion': true,
    '@aws-cdk/core:checkSecretUsage': true,
    '@aws-cdk/core:target-partitions': ['aws', 'aws-cn'],
    '@aws-cdk-containers/ecs-service-extensions:enableDefaultLogDriver': true,
    '@aws-cdk/aws-ec2:uniqueImdsv2TemplateName': true,
    '@aws-cdk/aws-ecs:arnFormatIncludesClusterName': true,
    '@aws-cdk/aws-iam:minimizePolicies': true,
    '@aws-cdk/core:validateSnapshotRemovalPolicy': true,
    '@aws-cdk/aws-codepipeline:crossAccountKeyAliasStackSafeResourceName': true,
    '@aws-cdk/aws-s3:createDefaultLoggingPolicy': true,
    '@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption': true,
    '@aws-cdk/aws-apigateway:disableCloudWatchRole': true,
    '@aws-cdk/core:enablePartitionLiterals': true,
    '@aws-cdk/aws-events:eventsTargetQueueSameAccount': true,
    '@aws-cdk/aws-ecs:disableExplicitDeploymentControllerForCircuitBreaker': true,
    '@aws-cdk/aws-iam:importedRoleStackSafeDefaultPolicyName': true,
    '@aws-cdk/aws-s3:serverAccessLogsUseBucketPolicy': true,
    '@aws-cdk/aws-route53-patters:useCertificate': true,
    '@aws-cdk/customresources:installLatestAwsSdkDefault': false,
    '@aws-cdk/aws-rds:databaseProxyUniqueResourceName': true,
    '@aws-cdk/aws-codedeploy:removeAlarmsFromDeploymentGroup': true,
    '@aws-cdk/aws-apigateway:authorizerChangeDeploymentLogicalId': true,
    '@aws-cdk/aws-ec2:launchTemplateDefaultUserData': true,
    '@aws-cdk/aws-secretsmanager:useAttachedSecretResourcePolicyForSecretTargetAttachments': true,
    '@aws-cdk/aws-redshift:columnId': true,
    '@aws-cdk/aws-stepfunctions-tasks:enableEmrServicePolicyV2': true,
    '@aws-cdk/aws-ec2:restrictDefaultSecurityGroup': true,
    '@aws-cdk/aws-apigateway:requestValidatorUniqueId': true,
    '@aws-cdk/aws-kms:aliasNameRef': true,
    '@aws-cdk/aws-kms:applyImportedAliasPermissionsToPrincipal': true,
    '@aws-cdk/aws-autoscaling:generateLaunchTemplateInsteadOfLaunchConfig': true,
    '@aws-cdk/core:includePrefixInUniqueNameGeneration': true,
    '@aws-cdk/aws-efs:denyAnonymousAccess': true,
    '@aws-cdk/aws-opensearchservice:enableOpensearchMultiAzWithStandby': true,
    '@aws-cdk/aws-lambda-nodejs:useLatestRuntimeVersion': true,
    '@aws-cdk/aws-efs:mountTargetOrderInsensitiveLogicalId': true,
    '@aws-cdk/aws-rds:auroraClusterChangeScopeOfInstanceParameterGroupWithEachParameters': true,
    '@aws-cdk/aws-appsync:useArnForSourceApiAssociationIdentifier': true,
    '@aws-cdk/aws-rds:preventRenderingDeprecatedCredentials': true,
    '@aws-cdk/aws-codepipeline-actions:useNewDefaultBranchForCodeCommitSource': true,
    '@aws-cdk/aws-cloudwatch-actions:changeLambdaPermissionLogicalIdForLambdaAction': true,
    '@aws-cdk/aws-codepipeline:crossAccountKeysDefaultValueToFalse': true,
    '@aws-cdk/aws-codepipeline:defaultPipelineTypeToV2': true,
    '@aws-cdk/aws-kms:reduceCrossAccountRegionPolicyScope': true,
    '@aws-cdk/aws-eks:nodegroupNameAttribute': true,
    '@aws-cdk/aws-eks:useNativeOidcProvider': true,
    '@aws-cdk/aws-ec2:ebsDefaultGp3Volume': true,
    '@aws-cdk/aws-ecs:removeDefaultDeploymentAlarm': true,
    '@aws-cdk/custom-resources:logApiResponseDataPropertyTrueDefault': false,
    '@aws-cdk/aws-s3:keepNotificationInImportedBucket': false,
    '@aws-cdk/core:explicitStackTags': true,
    '@aws-cdk/aws-ecs:reduceEc2FargateCloudWatchPermissions': true,
    '@aws-cdk/aws-dynamodb:resourcePolicyPerReplica': true,
    '@aws-cdk/aws-ec2:ec2SumTImeoutEnabled': true,
    '@aws-cdk/aws-appsync:appSyncGraphQLAPIScopeLambdaPermission': true,
    '@aws-cdk/aws-rds:setCorrectValueForDatabaseInstanceReadReplicaInstanceResourceId': true,
    '@aws-cdk/core:cfnIncludeRejectComplexResourceUpdateCreatePolicyIntrinsics': true,
    '@aws-cdk/aws-lambda-nodejs:sdkV3ExcludeSmithyPackages': true,
    '@aws-cdk/aws-stepfunctions-tasks:fixRunEcsTaskPolicy': true,
    '@aws-cdk/aws-ec2:bastionHostUseAmazonLinux2023ByDefault': true,
    '@aws-cdk/aws-route53-targets:userPoolDomainNameMethodWithoutCustomResource': true,
    '@aws-cdk/aws-elasticloadbalancingV2:albDualstackWithoutPublicIpv4SecurityGroupRulesDefault': true,
    '@aws-cdk/aws-iam:oidcRejectUnauthorizedConnections': true,
    '@aws-cdk/core:enableAdditionalMetadataCollection': true,
    '@aws-cdk/aws-lambda:createNewPoliciesWithAddToRolePolicy': false,
    '@aws-cdk/aws-s3:setUniqueReplicationRoleName': true,
    '@aws-cdk/aws-events:requireEventBusPolicySid': true,
    '@aws-cdk/core:aspectPrioritiesMutating': true,
    '@aws-cdk/aws-dynamodb:retainTableReplica': true,
    '@aws-cdk/aws-stepfunctions:useDistributedMapResultWriterV2': true,
    '@aws-cdk/s3-notifications:addS3TrustKeyPolicyForSnsSubscriptions': true,
    '@aws-cdk/aws-ec2:requirePrivateSubnetsForEgressOnlyInternetGateway': true,
    '@aws-cdk/aws-s3:publicAccessBlockedByDefault': true,
    '@aws-cdk/aws-lambda:useCdkManagedLogGroup': true,
    '@aws-cdk/aws-elasticloadbalancingv2:networkLoadBalancerWithSecurityGroupByDefault': true,
    '@aws-cdk/aws-ecs-patterns:uniqueTargetGroupId': true,
    '@aws-cdk/aws-route53-patterns:useDistribution': true,
    '@aws-cdk/aws-cloudfront:defaultFunctionRuntimeV2_0': true,
    '@aws-cdk/aws-elasticloadbalancingv2:usePostQuantumTlsPolicy': true,
  },
};

export function buildPythonCdkFiles({ projectName, appName, pascalName, infra = null, projectType = null, projectTypeConfig = {} }) {
  return [
    // ── Entry point ──────────────────────────────────────────────────────────
    {
      path: 'devops/cdk/app.py',
      content: `#!/usr/bin/env python3
"""CDK entry point for ${projectName}."""
import os

from aws_cdk import App, Environment

from stacks.main_stack import ${pascalName}Stack

app = App()

env = Environment(
    account=os.environ.get("CDK_DEFAULT_ACCOUNT"),
    region=os.environ.get("CDK_DEFAULT_REGION", "eu-west-2"),
)

# Stack name is suffixed with the environment so multiple environments can
# coexist in the same account.
${pascalName}Stack(
    app,
    f"${pascalName}Stack-{os.environ.get('CI_ENVIRONMENT_NAME', 'Dev')}",
    env=env,
)

app.synth()
`,
    },

    // ── CDK config ───────────────────────────────────────────────────────────
    {
      path: 'devops/cdk/cdk.json',
      content: JSON.stringify(CDK_JSON, null, 2),
    },

    // ── Python dependencies ──────────────────────────────────────────────────
    {
      path: 'devops/cdk/requirements.txt',
      content: `aws-cdk-lib>=2.272.0
constructs>=10.8.0
`,
    },

    {
      path: 'devops/cdk/requirements-dev.txt',
      content: `-r requirements.txt

pytest>=8.3.0
pytest-cov>=6.0.0
`,
    },

    // ── .gitignore ───────────────────────────────────────────────────────────
    {
      path: 'devops/cdk/.gitignore',
      content: `__pycache__/
*.py[cod]
.venv/
venv/
cdk.out/
cdk.context.json
.pytest_cache/
*.log
.DS_Store
`,
    },

    // ── Stacks ───────────────────────────────────────────────────────────────
    {
      path: 'devops/cdk/stacks/__init__.py',
      content: '',
    },

    {
      path: 'devops/cdk/stacks/main_stack.py',
      content: buildMainStackPy(pascalName, projectName, infra, projectType, projectTypeConfig),
    },

    // ── Constructs (optional helper) ─────────────────────────────────────────
    {
      path: 'devops/cdk/constructs/__init__.py',
      content: '',
    },

    {
      path: 'devops/cdk/constructs/README.md',
      content: `# Custom Constructs

Place reusable CDK constructs in this directory.

A construct encapsulates a group of related AWS resources that are frequently
deployed together.  Example:

\`\`\`python
from constructs import Construct
from aws_cdk import aws_s3 as s3, aws_cloudfront as cf


class StaticSite(Construct):
    """S3 + CloudFront static website construct."""

    def __init__(self, scope: Construct, id: str, *, domain: str) -> None:
        super().__init__(scope, id)

        self.bucket = s3.Bucket(self, "Bucket")
        self.distribution = cf.Distribution(
            self, "Distribution",
            default_behavior=cf.BehaviorOptions(
                origin=cf.origins.S3Origin(self.bucket)
            ),
        )
\`\`\`
`,
    },

    // ── Tests ────────────────────────────────────────────────────────────────
    {
      path: 'devops/cdk/tests/__init__.py',
      content: '',
    },

    {
      path: 'devops/cdk/tests/unit/__init__.py',
      content: '',
    },

    {
      path: 'devops/cdk/tests/unit/test_main_stack.py',
      content: `"""Unit tests for ${pascalName}Stack."""
import aws_cdk as cdk
import pytest
from aws_cdk import assertions

from stacks.main_stack import ${pascalName}Stack


@pytest.fixture(scope="module")
def template() -> assertions.Template:
    app = cdk.App()
    stack = ${pascalName}Stack(app, "TestStack")
    return assertions.Template.from_stack(stack)


def test_stack_synthesizes_without_errors(template: assertions.Template) -> None:
    """The stack must synthesise cleanly."""
    # If the fixture executed, synthesis succeeded.
    assert template is not None


def test_stack_name_output_exists(template: assertions.Template) -> None:
    """The StackName CfnOutput must be present."""
    template.has_output("StackName", {})


# ── Add your resource assertions below ──────────────────────────────────────
# Example — assert an S3 bucket exists with versioning enabled:
#
# def test_bucket_has_versioning(template):
#     template.has_resource_properties(
#         "AWS::S3::Bucket",
#         {"VersioningConfiguration": {"Status": "Enabled"}},
#     )
`,
    },

    // ── pytest config ────────────────────────────────────────────────────────
    {
      path: 'devops/cdk/pytest.ini',
      content: `[pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts = --strict-markers -q
`,
    },

    // ── README ───────────────────────────────────────────────────────────────
    {
      path: 'devops/cdk/README.md',
      content: `# ${projectName} — CDK Infrastructure

AWS CDK v2 infrastructure for **${projectName}**, written in Python.

## Structure

\`\`\`
devops/cdk/
├── app.py                    Entry point — synthesises all stacks
├── cdk.json                  CDK feature flags and context
├── requirements.txt          Runtime CDK dependencies
├── requirements-dev.txt      Dev + test dependencies
├── stacks/
│   └── main_stack.py         Main infrastructure stack ← add resources here
├── constructs/               Reusable CDK constructs
└── tests/unit/               CDK assertion tests
\`\`\`

## Quick start

\`\`\`bash
cd devops/cdk

# Create and activate a virtual environment
python -m venv .venv && source .venv/bin/activate

# Install dependencies
pip install -r requirements-dev.txt

# Synthesise (validate CloudFormation output)
cdk synth

# Show what will change
cdk diff

# Deploy to your default AWS account/region
cdk deploy
\`\`\`

## Running tests

\`\`\`bash
pytest
\`\`\`

## Environments

The stack name is suffixed with \`CI_ENVIRONMENT_NAME\` so multiple
environments can coexist in the same AWS account.

| CI variable | Example value |
|---|---|
| \`CI_ENVIRONMENT_NAME\` | \`Development\` / \`UAT\` / \`Production\` |
| \`CDK_DEFAULT_ACCOUNT\` | \`123456789012\` |
| \`CDK_DEFAULT_REGION\` | \`eu-west-2\` |
`,
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Infra-aware main_stack.py generator
// ─────────────────────────────────────────────────────────────────────────────

function buildMainStackPy(pascalName, projectName, infra, projectType, config = {}) {
  const id = infra?.id ?? 'none';

  const pyVer   = config.pythonVersion ?? '3.14';
  const ptId    = projectType?.id ?? 'none';

  const INFRA_STACKS = {
    'ecs-fargate': {
      imports: `from aws_cdk import aws_ec2 as ec2, aws_ecs as ecs, aws_ecs_patterns as ecs_patterns`,
      body: `        vpc = ec2.Vpc(self, "Vpc", max_azs=2)
        cluster = ecs.Cluster(self, "Cluster", vpc=vpc)

        # Replace the container image with your own ECR image after first deploy.
        service = ecs_patterns.ApplicationLoadBalancedFargateService(
            self, "Service",
            cluster=cluster,
            cpu=256,
            memory_limit_mib=512,
            desired_count=1,
            task_image_options=ecs_patterns.ApplicationLoadBalancedTaskImageOptions(
                image=ecs.ContainerImage.from_registry("amazon/amazon-ecs-sample"),
                container_port=8080,
            ),
            public_load_balancer=True,
        )

        CfnOutput(self, "LoadBalancerDNS", value=service.load_balancer.load_balancer_dns_name)`,
    },
    'ecs-ec2': {
      imports: `from aws_cdk import aws_ec2 as ec2, aws_ecs as ecs`,
      body: `        vpc     = ec2.Vpc(self, "Vpc", max_azs=2)
        cluster = ecs.Cluster(self, "Cluster", vpc=vpc)
        cluster.add_capacity(
            "DefaultAutoScalingGroup",
            instance_type=ec2.InstanceType("t3.medium"),
            desired_capacity=2,
        )`,
    },
    'lambda': {
      imports: `from aws_cdk import aws_lambda as _lambda`,
      body: `        fn = _lambda.Function(
            self, "${pascalName}Function",
            runtime=_lambda.Runtime.PYTHON_${pyVer.replace('.', '_')},
            handler="handler.lambda_handler",
            code=_lambda.Code.from_asset("../../src"),
            description="${projectName}",
        )

        CfnOutput(self, "FunctionArn", value=fn.function_arn)`,
    },
    's3-cloudfront': {
      imports: `from aws_cdk import RemovalPolicy as RP, aws_s3 as s3, aws_cloudfront as cf, aws_cloudfront_origins as origins`,
      body: `        bucket = s3.Bucket(
            self, "${pascalName}Bucket",
            website_index_document="index.html",
            website_error_document="index.html",
            public_read_access=True,
            object_ownership=s3.ObjectOwnership.OBJECT_WRITER,
            block_public_access=s3.BlockPublicAccess(
                block_public_acls=False, ignore_public_acls=False,
                block_public_policy=False, restrict_public_buckets=False,
            ),
            removal_policy=RP.DESTROY,
            auto_delete_objects=True,
        )

        distribution = cf.Distribution(
            self, "${pascalName}Distribution",
            default_behavior=cf.BehaviorOptions(
                origin=origins.S3StaticWebsiteOrigin(bucket=bucket),
                viewer_protocol_policy=cf.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            ),
        )

        CfnOutput(self, "BucketName",     value=bucket.bucket_name)
        CfnOutput(self, "DistributionId", value=distribution.distribution_id)`,
    },
    'eks': {
      imports: `from aws_cdk import aws_eks as eks, aws_ec2 as ec2`,
      body: `        vpc     = ec2.Vpc(self, "Vpc", max_azs=2)
        cluster = eks.Cluster(
            self, "${pascalName}Cluster",
            version=eks.KubernetesVersion.V1_31,
            vpc=vpc,
        )

        CfnOutput(self, "ClusterName", value=cluster.cluster_name)`,
    },
    'k8s-ec2': {
      imports: `from aws_cdk import aws_eks as eks, aws_ec2 as ec2`,
      body: `        vpc     = ec2.Vpc(self, "Vpc", max_azs=2)
        # Self-managed K8s on EC2 — nodes managed by an Auto Scaling Group
        cluster = eks.Cluster(
            self, "${pascalName}Cluster",
            version=eks.KubernetesVersion.V1_31,
            vpc=vpc,
            default_capacity=2,
            default_capacity_instance=ec2.InstanceType.of(
                ec2.InstanceClass.T3, ec2.InstanceSize.MEDIUM
            ),
        )`,
    },
    'ec2': {
      imports: `from aws_cdk import aws_ec2 as ec2`,
      body: `        vpc = ec2.Vpc(self, "Vpc", max_azs=2)
        instance = ec2.Instance(
            self, "${pascalName}Instance",
            instance_type=ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.SMALL),
            machine_image=ec2.AmazonLinuxImage(
                generation=ec2.AmazonLinuxGeneration.AMAZON_LINUX_2023
            ),
            vpc=vpc,
        )`,
    },
  };

  const spec = INFRA_STACKS[id];

  const imports     = spec ? spec.imports     : '# No specific infra architecture selected';
  const infraBody   = spec ? spec.body        : '        # Add your AWS resources here\n        pass';

  return `"""${pascalName} — main CDK stack.

${projectType ? `Project type: ${projectType.name || projectType.id}` : ''}
Infra architecture: ${infra?.name ?? 'None (generic)'}
"""
from aws_cdk import CfnOutput, Stack
from constructs import Construct
${imports}


class ${pascalName}Stack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

${infraBody}

        CfnOutput(self, "StackName", value=self.stack_name)
`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Preview defaults ────────────────────────────────────────────────────────────

export const PYTHON_CDK_PREVIEW_VARS = {
  projectName: 'my-project',
  appName: 'my_project',
  pascalName: 'MyProject',
};

export const PYTHON_CDK_META = {
  id: 'python-cdk',
  label: 'Python CDK',
  description: 'AWS CDK v2 · Python · pytest · devops/cdk/',
  fileCount: 13,
};
