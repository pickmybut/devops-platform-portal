/** AWS Lambda function in Java — Maven, RequestHandler, JUnit 5 */

export function buildJavaLambdaFiles({ projectName, appName, pascalName, description, config = {} }) {
  const javaVer = config.javaVersion ?? '21';
  const pkg     = `com.radius.${appName}`;
  const pkgPath = pkg.replace(/\./g, '/');

  return [
    {
      path: 'pom.xml',
      content: `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
           https://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.radius</groupId>
  <artifactId>${projectName}</artifactId>
  <version>1.0.0-SNAPSHOT</version>
  <description>${description || ''}</description>
  <packaging>jar</packaging>

  <properties>
    <java.version>${javaVer}</java.version>
    <maven.compiler.source>${javaVer}</maven.compiler.source>
    <maven.compiler.target>${javaVer}</maven.compiler.target>
  </properties>

  <dependencies>
    <dependency>
      <groupId>com.amazonaws</groupId>
      <artifactId>aws-lambda-java-core</artifactId>
      <version>1.2.3</version>
    </dependency>
    <dependency>
      <groupId>com.amazonaws</groupId>
      <artifactId>aws-lambda-java-events</artifactId>
      <version>3.13.0</version>
    </dependency>
    <dependency>
      <groupId>com.fasterxml.jackson.core</groupId>
      <artifactId>jackson-databind</artifactId>
      <version>2.17.2</version>
    </dependency>
    <dependency>
      <groupId>org.junit.jupiter</groupId>
      <artifactId>junit-jupiter</artifactId>
      <version>5.11.3</version>
      <scope>test</scope>
    </dependency>
  </dependencies>

  <build>
    <plugins>
      <plugin>
        <groupId>org.apache.maven.plugins</groupId>
        <artifactId>maven-shade-plugin</artifactId>
        <version>3.6.0</version>
        <executions>
          <execution>
            <phase>package</phase>
            <goals><goal>shade</goal></goals>
            <configuration>
              <createDependencyReducedPom>false</createDependencyReducedPom>
            </configuration>
          </execution>
        </executions>
      </plugin>
      <plugin>
        <groupId>org.apache.maven.plugins</groupId>
        <artifactId>maven-surefire-plugin</artifactId>
        <version>3.2.5</version>
      </plugin>
    </plugins>
  </build>
</project>
`,
    },
    {
      path: `src/main/java/${pkgPath}/Handler.java`,
      content: `package ${pkg};

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;

import java.util.Map;

/**
 * ${pascalName} Lambda handler.
 * ${description || ''}
 */
public class Handler implements RequestHandler<APIGatewayProxyRequestEvent, APIGatewayProxyResponseEvent> {

    @Override
    public APIGatewayProxyResponseEvent handleRequest(APIGatewayProxyRequestEvent event, Context context) {
        context.getLogger().log("Event: " + event);

        return new APIGatewayProxyResponseEvent()
            .withStatusCode(200)
            .withHeaders(Map.of("Content-Type", "application/json"))
            .withBody("{\\"message\\":\\"Hello from ${projectName}\\"}");
    }
}
`,
    },
    {
      path: `src/test/java/${pkgPath}/HandlerTest.java`,
      content: `package ${pkg};

import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class HandlerTest {

    private final Handler handler = new Handler();

    @Test
    void handleRequest_returns200() {
        var event  = new APIGatewayProxyRequestEvent().withHttpMethod("GET").withPath("/");
        var result = handler.handleRequest(event, null);

        assertEquals(200, result.getStatusCode());
        assertTrue(result.getBody().contains("Hello"));
    }
}
`,
    },
    {
      path: '.gitignore',
      content: `target/\n.mvn/\n.idea/\n*.iml\n*.class\n.DS_Store\nfunction.zip\n`,
    },
    {
      path: 'README.md',
      content: `# ${pascalName} — Java Lambda

${description || 'AWS Lambda function in Java.'}

## Stack

Java ${javaVer} · AWS Lambda · Maven Shade Plugin

## Build

\`\`\`bash
mvn package
# target/${projectName}-1.0.0-SNAPSHOT.jar is the fat jar
\`\`\`

## Deploy via CDK / SAM

The generated fat jar is the deployment artifact. Reference it in your CDK stack:

\`\`\`python
from aws_cdk import aws_lambda as _lambda
fn = _lambda.Function(self, "Fn",
    runtime=_lambda.Runtime.JAVA_${javaVer},
    handler="${pkg}.Handler",
    code=_lambda.Code.from_asset("target/${projectName}-1.0.0-SNAPSHOT.jar"),
)
\`\`\`
`,
    },
  ];
}

export const JAVA_LAMBDA_PREVIEW_VARS = {
  projectName: 'my-java-lambda',
  appName:     'my_java_lambda',
  pascalName:  'MyJavaLambda',
  description: 'AWS Lambda function in Java',
  config:      { javaVersion: '21', buildTool: 'maven' },
};

export const JAVA_LAMBDA_META = {
  id:          'java-lambda',
  label:       'Java Lambda',
  description: 'Java 21 · AWS Lambda · Maven Shade · JUnit 5',
  fileCount:   5,
};
