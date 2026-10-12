// ─────────────────────────────────────────────────────────────────────────────
// Project Type templates
// ─────────────────────────────────────────────────────────────────────────────
import { buildDjangoApiFiles,     DJANGO_API_PREVIEW_VARS,     DJANGO_API_META     } from './django-api';
import { buildFastApiFiles,       FASTAPI_PREVIEW_VARS,        FASTAPI_META        } from './fastapi';
import { buildPythonLambdaFiles,  PYTHON_LAMBDA_PREVIEW_VARS,  PYTHON_LAMBDA_META  } from './python-lambda';
import { buildServerlessFiles,    SERVERLESS_PREVIEW_VARS,     SERVERLESS_META     } from './serverless';
import { buildApiGatewayFiles,    API_GATEWAY_PREVIEW_VARS,    API_GATEWAY_META    } from './api-gateway';
import { buildJavaSpringFiles,    JAVA_SPRING_PREVIEW_VARS,    JAVA_SPRING_META    } from './java-spring';
import { buildJavaLambdaFiles,    JAVA_LAMBDA_PREVIEW_VARS,    JAVA_LAMBDA_META    } from './java-lambda';
import { buildReactMfeFiles,      REACT_MFE_PREVIEW_VARS,      REACT_MFE_META      } from './react-mfe';
import { buildReactShellFiles,    REACT_SHELL_PREVIEW_VARS,    REACT_SHELL_META    } from './react-shell';
import { buildNodejsApiFiles,     NODEJS_API_PREVIEW_VARS,     NODEJS_API_META     } from './nodejs-api';
import { buildNodejsLambdaFiles,  NODEJS_LAMBDA_PREVIEW_VARS,  NODEJS_LAMBDA_META  } from './nodejs-lambda';
import { buildDotnetApiFiles,     DOTNET_API_PREVIEW_VARS,     DOTNET_API_META     } from './dotnet-api';
import { buildCdkStackFiles,      CDK_STACK_PREVIEW_VARS,      CDK_STACK_META      } from './cdk-stack';

// ─────────────────────────────────────────────────────────────────────────────
// IaC templates
// ─────────────────────────────────────────────────────────────────────────────
import { buildPythonCdkFiles,     PYTHON_CDK_PREVIEW_VARS,     PYTHON_CDK_META     } from './python-cdk';
import { buildTypescriptCdkFiles, TYPESCRIPT_CDK_PREVIEW_VARS, TYPESCRIPT_CDK_META } from './typescript-cdk';
import { buildCsharpCdkFiles,     CSHARP_CDK_PREVIEW_VARS,     CSHARP_CDK_META     } from './csharp-cdk';
import { buildTerraformFiles,     TERRAFORM_PREVIEW_VARS,      TERRAFORM_META      } from './terraform';
import { buildCloudFormationFiles,CLOUDFORMATION_PREVIEW_VARS, CLOUDFORMATION_META } from './cloudformation';
import { buildPulumiPythonFiles,  PULUMI_PYTHON_PREVIEW_VARS,  PULUMI_PYTHON_META  } from './pulumi-python';
import { buildPulumiTsFiles,      PULUMI_TS_PREVIEW_VARS,      PULUMI_TS_META      } from './pulumi-ts';
import { buildAwsSamFiles,        AWS_SAM_PREVIEW_VARS,        AWS_SAM_META        } from './aws-sam';

// ─────────────────────────────────────────────────────────────────────────────
// PROJECT TYPE registry
// key = project type id (matches templateCategories.js PROJECT_TYPES ids)
// ─────────────────────────────────────────────────────────────────────────────
export const TEMPLATE_REGISTRY = {
  'django-api':    { meta: DJANGO_API_META,    previewVars: DJANGO_API_PREVIEW_VARS,    build: buildDjangoApiFiles    },
  'fastapi':       { meta: FASTAPI_META,       previewVars: FASTAPI_PREVIEW_VARS,       build: buildFastApiFiles       },
  'python-lambda': { meta: PYTHON_LAMBDA_META, previewVars: PYTHON_LAMBDA_PREVIEW_VARS, build: buildPythonLambdaFiles  },
  'serverless':    { meta: SERVERLESS_META,    previewVars: SERVERLESS_PREVIEW_VARS,    build: buildServerlessFiles    },
  'api-gateway':   { meta: API_GATEWAY_META,   previewVars: API_GATEWAY_PREVIEW_VARS,   build: buildApiGatewayFiles    },
  'java-spring':   { meta: JAVA_SPRING_META,   previewVars: JAVA_SPRING_PREVIEW_VARS,   build: buildJavaSpringFiles    },
  'java-lambda':   { meta: JAVA_LAMBDA_META,   previewVars: JAVA_LAMBDA_PREVIEW_VARS,   build: buildJavaLambdaFiles    },
  'react-mfe':     { meta: REACT_MFE_META,     previewVars: REACT_MFE_PREVIEW_VARS,     build: buildReactMfeFiles      },
  'react-shell':   { meta: REACT_SHELL_META,   previewVars: REACT_SHELL_PREVIEW_VARS,   build: buildReactShellFiles    },
  'nodejs-api':    { meta: NODEJS_API_META,    previewVars: NODEJS_API_PREVIEW_VARS,    build: buildNodejsApiFiles     },
  'nodejs-lambda': { meta: NODEJS_LAMBDA_META, previewVars: NODEJS_LAMBDA_PREVIEW_VARS, build: buildNodejsLambdaFiles  },
  'dotnet-api':    { meta: DOTNET_API_META,    previewVars: DOTNET_API_PREVIEW_VARS,    build: buildDotnetApiFiles     },
  'cdk-stack':     { meta: CDK_STACK_META,     previewVars: CDK_STACK_PREVIEW_VARS,     build: buildCdkStackFiles      },
};

/** Returns the project-type template, or null if not yet implemented. */
export function getTemplate(projectTypeId) {
  return TEMPLATE_REGISTRY[projectTypeId] ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// IaC registry
// key = IaC option id (matches templateCategories.js IAC_OPTIONS ids)
// All IaC build fns receive: { projectName, appName, pascalName, infra, projectType, projectTypeConfig }
// ─────────────────────────────────────────────────────────────────────────────
export const IAC_TEMPLATE_REGISTRY = {
  'python-cdk':    { meta: PYTHON_CDK_META,     previewVars: PYTHON_CDK_PREVIEW_VARS,     build: buildPythonCdkFiles     },
  'typescript-cdk':{ meta: TYPESCRIPT_CDK_META, previewVars: TYPESCRIPT_CDK_PREVIEW_VARS, build: buildTypescriptCdkFiles },
  'csharp-cdk':    { meta: CSHARP_CDK_META,     previewVars: CSHARP_CDK_PREVIEW_VARS,     build: buildCsharpCdkFiles     },
  'terraform':     { meta: TERRAFORM_META,      previewVars: TERRAFORM_PREVIEW_VARS,      build: buildTerraformFiles     },
  'cloudformation':{ meta: CLOUDFORMATION_META, previewVars: CLOUDFORMATION_PREVIEW_VARS, build: buildCloudFormationFiles},
  'pulumi-python': { meta: PULUMI_PYTHON_META,  previewVars: PULUMI_PYTHON_PREVIEW_VARS,  build: buildPulumiPythonFiles  },
  'pulumi-ts':     { meta: PULUMI_TS_META,       previewVars: PULUMI_TS_PREVIEW_VARS,      build: buildPulumiTsFiles      },
  'sam':           { meta: AWS_SAM_META,         previewVars: AWS_SAM_PREVIEW_VARS,        build: buildAwsSamFiles        },
};

/** Returns the IaC template, or null if not yet implemented. */
export function getIacTemplate(iacId) {
  return IAC_TEMPLATE_REGISTRY[iacId] ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// CI/CD registry
// ─────────────────────────────────────────────────────────────────────────────
import {
  buildBasicPipelineFiles as buildGitLabBasicPipelineFiles,
  BASIC_PIPELINE_PREVIEW_VARS as GITLAB_BASIC_PREVIEW_VARS,
  BASIC_PIPELINE_META as GITLAB_BASIC_META,
} from './gitlab-basic';

import {
  buildBasicPipelineFiles as buildGitHubBasicPipelineFiles,
  BASIC_PIPELINE_PREVIEW_VARS as GITHUB_BASIC_PREVIEW_VARS,
  BASIC_PIPELINE_META as GITHUB_BASIC_META,
} from './github-basic';

import {
  buildBasicPipelineFiles as buildBitbucketBasicPipelineFiles,
  BASIC_PIPELINE_PREVIEW_VARS as BITBUCKET_BASIC_PREVIEW_VARS,
  BASIC_PIPELINE_META as BITBUCKET_BASIC_META,
} from './bitbucket-basic';

import {
  buildBasicPipelineFiles as buildAwsCodePipelineBasicPipelineFiles,
  BASIC_PIPELINE_PREVIEW_VARS as AWS_CODEPIPELINE_BASIC_PREVIEW_VARS,
  BASIC_PIPELINE_META as AWS_CODEPIPELINE_BASIC_META,
} from './aws-codepipeline-basic';

// Platform-specific CI/CD registries
const CICD_TEMPLATE_REGISTRY_BY_PLATFORM = {
  gitlab: {
    basic: {
      meta: GITLAB_BASIC_META,
      previewVars: GITLAB_BASIC_PREVIEW_VARS,
      build: buildGitLabBasicPipelineFiles,
    },
  },
  github: {
    basic: {
      meta: GITHUB_BASIC_META,
      previewVars: GITHUB_BASIC_PREVIEW_VARS,
      build: buildGitHubBasicPipelineFiles,
    },
  },
  bitbucket: {
    basic: {
      meta: BITBUCKET_BASIC_META,
      previewVars: BITBUCKET_BASIC_PREVIEW_VARS,
      build: buildBitbucketBasicPipelineFiles,
    },
  },
  'aws-codepipeline': {
    basic: {
      meta: AWS_CODEPIPELINE_BASIC_META,
      previewVars: AWS_CODEPIPELINE_BASIC_PREVIEW_VARS,
      build: buildAwsCodePipelineBasicPipelineFiles,
    },
  },
};

// Fallback to GitLab (default)
export const CICD_TEMPLATE_REGISTRY = CICD_TEMPLATE_REGISTRY_BY_PLATFORM.gitlab;

/**
 * Returns the CI/CD template for a given cicdId and platform.
 * @param {string} cicdId - The CI/CD option id (e.g., 'basic')
 * @param {string} [platformId='gitlab'] - The platform id (e.g., 'gitlab', 'github', 'bitbucket', 'aws-codepipeline')
 * @returns {object|null} The template definition or null if not implemented
 */
export function getCicdTemplate(cicdId, platformId = 'gitlab') {
  const platformRegistry = CICD_TEMPLATE_REGISTRY_BY_PLATFORM[platformId] ?? CICD_TEMPLATE_REGISTRY_BY_PLATFORM.gitlab;
  return platformRegistry[cicdId] ?? null;
}
