/** ASP.NET Core Minimal API — .NET 8/9, Docker, xUnit */

export function buildDotnetApiFiles({ projectName, appName, pascalName, description, config = {} }) {
  const dotnetVer = config.dotnetVersion ?? '8.0';
  const major     = dotnetVer.split('.')[0];
  const auth      = config.auth ?? 'none';

  return [
    {
      path: `${pascalName}.csproj`,
      content: `<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net${dotnetVer}</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <RootNamespace>Radius.${pascalName}</RootNamespace>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.AspNetCore.OpenApi" Version="${major}.*" />
    <PackageReference Include="Swashbuckle.AspNetCore" Version="7.*" />
    ${auth === 'jwt' ? `<PackageReference Include="Microsoft.AspNetCore.Authentication.JwtBearer" Version="${major}.*" />` : ''}
  </ItemGroup>
</Project>
`,
    },
    {
      path: 'Program.cs',
      content: `using Radius.${pascalName};

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
${auth === 'jwt' ? 'builder.Services.AddAuthentication().AddJwtBearer();\nbuilder.Services.AddAuthorization();\n' : ''}
var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
${auth === 'jwt' ? 'app.UseAuthentication();\napp.UseAuthorization();\n' : ''}
// ── Endpoints ─────────────────────────────────────────────────────────────────
app.MapGet("/",      () => Results.Ok(new { service = "${projectName}", status = "ok" }));
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

// Add your endpoints here:
// app.MapGet("/example", () => "Hello, World!");

app.Run();

// Make Program partial so it can be referenced in integration tests
public partial class Program { }
`,
    },
    {
      path: 'appsettings.json',
      content: JSON.stringify({
        Logging: { LogLevel: { Default: 'Information', 'Microsoft.AspNetCore': 'Warning' } },
        AllowedHosts: '*',
      }, null, 2),
    },
    {
      path: 'appsettings.Development.json',
      content: JSON.stringify({ Logging: { LogLevel: { Default: 'Debug', 'System': 'Information', 'Microsoft': 'Information' } } }, null, 2),
    },
    {
      path: `tests/${pascalName}.Tests.csproj`,
      content: `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net${dotnetVer}</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <IsPackable>false</IsPackable>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.AspNetCore.Mvc.Testing" Version="${major}.*" />
    <PackageReference Include="xunit" Version="2.*" />
    <PackageReference Include="xunit.runner.visualstudio" Version="2.*" />
  </ItemGroup>
  <ItemGroup>
    <ProjectReference Include="../${pascalName}.csproj" />
  </ItemGroup>
</Project>
`,
    },
    {
      path: 'tests/HealthTests.cs',
      content: `using Microsoft.AspNetCore.Mvc.Testing;

namespace Radius.${pascalName}.Tests;

public class HealthTests(WebApplicationFactory<Program> factory) : IClassFixture<WebApplicationFactory<Program>>
{
    [Fact]
    public async Task Health_Returns_Ok()
    {
        var client   = factory.CreateClient();
        var response = await client.GetAsync("/health");
        response.EnsureSuccessStatusCode();
    }
}
`,
    },
    {
      path: 'Dockerfile',
      content: `FROM mcr.microsoft.com/dotnet/sdk:${dotnetVer} AS build
WORKDIR /src
COPY ${pascalName}.csproj .
RUN dotnet restore
COPY . .
RUN dotnet publish -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:${dotnetVer} AS runtime
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 8080
ENTRYPOINT ["dotnet", "${pascalName}.dll"]
`,
    },
    { path: '.gitignore', content: `bin/\nobj/\n.vs/\n*.user\n.env\n*.log\n.DS_Store\n` },
    {
      path: 'README.md',
      content: `# ${pascalName}\n\n${description || 'ASP.NET Core Minimal API.'}\n\n## Stack\n\n.NET ${dotnetVer} · Minimal API · Swagger · Docker\n\n## Run\n\n\`\`\`bash\ndotnet run\n# http://localhost:5000\n# http://localhost:5000/swagger\n\`\`\`\n\n## Test\n\n\`\`\`bash\ndotnet test\n\`\`\`\n`,
    },
  ];
}

export const DOTNET_API_PREVIEW_VARS = { projectName: 'my-dotnet-api', appName: 'my_dotnet_api', pascalName: 'MyDotnetApi', description: 'ASP.NET Core Minimal API', config: { dotnetVersion: '8.0', auth: 'none' } };
export const DOTNET_API_META = { id: 'dotnet-api', label: '.NET API', description: '.NET 8 · Minimal API · xUnit · Docker', fileCount: 9 };
