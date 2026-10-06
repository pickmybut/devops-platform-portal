/** C# CDK v2 — files in devops/cdk/ */

export function buildCsharpCdkFiles({ projectName, appName, pascalName, description }) {
  const ns = `Radius.${pascalName}Cdk`;

  return [
    {
      path: `devops/cdk/src/${pascalName}Cdk.csproj`,
      content: `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net8.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <RootNamespace>${ns}</RootNamespace>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Amazon.CDK.Lib" Version="2.*" />
    <PackageReference Include="Constructs" Version="10.*" />
  </ItemGroup>
</Project>
`,
    },
    {
      path: 'devops/cdk/src/Program.cs',
      content: `using Amazon.CDK;
using ${ns};

var app = new App();

new ${pascalName}Stack(app, $"${pascalName}Stack-{System.Environment.GetEnvironmentVariable("CI_ENVIRONMENT_NAME") ?? "Dev"}", new StackProps
{
    Env = new Amazon.CDK.Environment
    {
        Account = System.Environment.GetEnvironmentVariable("CDK_DEFAULT_ACCOUNT"),
        Region  = System.Environment.GetEnvironmentVariable("CDK_DEFAULT_REGION") ?? "eu-west-2",
    },
});

app.Synth();
`,
    },
    {
      path: `devops/cdk/src/${pascalName}Stack.cs`,
      content: `using Amazon.CDK;
using Constructs;

namespace ${ns};

public class ${pascalName}Stack : Stack
{
    public ${pascalName}Stack(Construct scope, string id, IStackProps? props = null)
        : base(scope, id, props)
    {
        // ── Add your AWS resources here ────────────────────────────────────
        // Example:
        // var bucket = new Amazon.CDK.AWS.S3.Bucket(this, "MyBucket");

        new CfnOutput(this, "StackName", new CfnOutputProps { Value = this.StackName });
    }
}
`,
    },
    {
      path: 'devops/cdk/cdk.json',
      content: JSON.stringify({ app: `dotnet run --project src/${pascalName}Cdk.csproj`, context: { '@aws-cdk/aws-lambda:recognizeLayerVersion': true, '@aws-cdk/core:checkSecretUsage': true, '@aws-cdk/aws-iam:minimizePolicies': true, '@aws-cdk/customresources:installLatestAwsSdkDefault': false, '@aws-cdk/aws-ec2:restrictDefaultSecurityGroup': true } }, null, 2),
    },
    {
      path: 'devops/cdk/global.json',
      content: JSON.stringify({ sdk: { version: '8.0.0', rollForward: 'latestMinor' } }, null, 2),
    },
    { path: 'devops/cdk/.gitignore', content: `bin/\nobj/\n.vs/\ncdk.out/\n*.log\n.DS_Store\n` },
    {
      path: 'devops/cdk/README.md',
      content: `# ${projectName} — CDK Infrastructure (C#)\n\n${description || ''}\n\n\`\`\`bash\ncd devops/cdk\ncdk synth\ncdk deploy\n\`\`\`\n`,
    },
  ];
}

export const CSHARP_CDK_PREVIEW_VARS = { projectName: 'my-project', appName: 'my_project', pascalName: 'MyProject', description: 'C# CDK infrastructure', config: {} };
export const CSHARP_CDK_META = { id: 'csharp-cdk', label: 'C# CDK', description: 'AWS CDK v2 · C# · .NET 8 · devops/cdk/', fileCount: 7 };
