/** AWS CloudFormation — template in devops/cloudformation/ */

export function buildCloudFormationFiles({ projectName, appName, description, infra }) {
  const infraId = infra?.id ?? 'none';

  return [
    {
      path: 'devops/cloudformation/template.yaml',
      content: `AWSTemplateFormatVersion: '2010-09-09'
Description: ${description || projectName}

Parameters:
  Environment:
    Type: String
    AllowedValues: [dev, staging, prod]
    Default: dev

  ProjectName:
    Type: String
    Default: ${projectName}

# ── Resources ────────────────────────────────────────────────────────────────
Resources:
${cloudFormationResources(appName, infraId)}

# ── Outputs ──────────────────────────────────────────────────────────────────
Outputs:
  StackName:
    Value: !Ref AWS::StackName
    Export:
      Name: !Sub "\${AWS::StackName}-name"

  Environment:
    Value: !Ref Environment
    Export:
      Name: !Sub "\${AWS::StackName}-env"
`,
    },
    {
      path: 'devops/cloudformation/parameters/dev.json',
      content: JSON.stringify([{ ParameterKey: 'Environment', ParameterValue: 'dev' }, { ParameterKey: 'ProjectName', ParameterValue: projectName }], null, 2),
    },
    { path: 'devops/cloudformation/.gitignore', content: `*.log\n.DS_Store\npackaged-template.yaml\n` },
    {
      path: 'devops/cloudformation/README.md',
      content: `# ${projectName} — CloudFormation\n\n${description || ''}\n\n## Deploy\n\n\`\`\`bash\n# Validate\naws cloudformation validate-template --template-body file://devops/cloudformation/template.yaml\n\n# Deploy\naws cloudformation deploy \\\\\n  --template-file devops/cloudformation/template.yaml \\\\\n  --stack-name ${projectName}-dev \\\\\n  --parameter-overrides Environment=dev \\\\\n  --capabilities CAPABILITY_IAM\n\`\`\`\n`,
    },
  ];
}

function cloudFormationResources(slug, infraId) {
  if (infraId === 'ecs-fargate') return `  ECSCluster:\n    Type: AWS::ECS::Cluster\n    Properties:\n      ClusterName: !Sub "\${ProjectName}-\${Environment}"\n      Tags:\n        - Key: Project\n          Value: !Ref ProjectName`;
  if (infraId === 'lambda') return `  LambdaFunction:\n    Type: AWS::Lambda::Function\n    Properties:\n      FunctionName: !Sub "\${ProjectName}-\${Environment}"\n      Runtime: python3.14\n      Handler: handler.lambda_handler\n      Role: !GetAtt LambdaRole.Arn\n      Code:\n        ZipFile: |\n          def lambda_handler(event, context):\n              return {"statusCode": 200, "body": "ok"}\n\n  LambdaRole:\n    Type: AWS::IAM::Role\n    Properties:\n      AssumeRolePolicyDocument:\n        Version: '2012-10-17'\n        Statement:\n          - Effect: Allow\n            Principal: {Service: lambda.amazonaws.com}\n            Action: sts:AssumeRole\n      ManagedPolicyArns:\n        - arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole`;
  if (infraId === 's3-cloudfront') return `  SiteBucket:\n    Type: AWS::S3::Bucket\n    Properties:\n      BucketName: !Sub "\${ProjectName}-\${Environment}-site"\n      WebsiteConfiguration:\n        IndexDocument: index.html\n        ErrorDocument: index.html`;
  return `  # Add your AWS resources here\n  # See https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-template-resource-type-ref.html`;
}

export const CLOUDFORMATION_PREVIEW_VARS = { projectName: 'my-project', appName: 'my_project', pascalName: 'MyProject', description: 'CloudFormation infrastructure', infra: null };
export const CLOUDFORMATION_META = { id: 'cloudformation', label: 'CloudFormation', description: 'AWS CloudFormation YAML · devops/cloudformation/', fileCount: 4 };
