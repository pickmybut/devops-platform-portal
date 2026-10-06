/** Spring Boot 3 microservice — Maven, Actuator, Docker, JUnit 5 */

export function buildJavaSpringFiles({ projectName, appName, pascalName, description, config = {} }) {
  const javaVer = config.javaVersion ?? '21';
  const db      = config.database    ?? 'postgresql';

  const pkg     = `com.radius.${appName}`;
  const pkgPath = pkg.replace(/\./g, '/');

  const dbDep = db === 'postgresql'
    ? `\t\t<dependency>
\t\t\t<groupId>org.postgresql</groupId>
\t\t\t<artifactId>postgresql</artifactId>
\t\t\t<scope>runtime</scope>
\t\t</dependency>
\t\t<dependency>
\t\t\t<groupId>org.springframework.boot</groupId>
\t\t\t<artifactId>spring-boot-starter-data-jpa</artifactId>
\t\t</dependency>`
    : db === 'mysql'
    ? `\t\t<dependency>
\t\t\t<groupId>com.mysql</groupId>
\t\t\t<artifactId>mysql-connector-j</artifactId>
\t\t\t<scope>runtime</scope>
\t\t</dependency>
\t\t<dependency>
\t\t\t<groupId>org.springframework.boot</groupId>
\t\t\t<artifactId>spring-boot-starter-data-jpa</artifactId>
\t\t</dependency>`
    : db === 'h2'
    ? `\t\t<dependency>
\t\t\t<groupId>com.h2database</groupId>
\t\t\t<artifactId>h2</artifactId>
\t\t\t<scope>runtime</scope>
\t\t</dependency>
\t\t<dependency>
\t\t\t<groupId>org.springframework.boot</groupId>
\t\t\t<artifactId>spring-boot-starter-data-jpa</artifactId>
\t\t</dependency>`
    : '';

  return [
    {
      path: 'pom.xml',
      content: `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
           https://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>

  <parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.3.4</version>
    <relativePath/>
  </parent>

  <groupId>com.radius</groupId>
  <artifactId>${projectName}</artifactId>
  <version>0.0.1-SNAPSHOT</version>
  <name>${pascalName}</name>
  <description>${description || ''}</description>

  <properties>
    <java.version>${javaVer}</java.version>
  </properties>

  <dependencies>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-actuator</artifactId>
    </dependency>
${dbDep}
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-test</artifactId>
      <scope>test</scope>
    </dependency>
  </dependencies>

  <build>
    <plugins>
      <plugin>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-maven-plugin</artifactId>
      </plugin>
    </plugins>
  </build>
</project>
`,
    },
    {
      path: `src/main/java/${pkgPath}/Application.java`,
      content: `package ${pkg};

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class ${pascalName}Application {
    public static void main(String[] args) {
        SpringApplication.run(${pascalName}Application.class, args);
    }
}
`,
    },
    {
      path: `src/main/java/${pkgPath}/controller/HealthController.java`,
      content: `package ${pkg}.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class HealthController {

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }
}
`,
    },
    {
      path: 'src/main/resources/application.properties',
      content: `spring.application.name=${projectName}
server.port=8080
management.endpoints.web.exposure.include=health,info
management.endpoint.health.show-details=when-authorized
${db === 'postgresql' ? `\nspring.datasource.url=jdbc:postgresql://localhost:5432/${appName}\nspring.datasource.username=postgres\nspring.datasource.password=postgres\nspring.jpa.hibernate.ddl-auto=update` : ''}
${db === 'h2' ? `\nspring.datasource.url=jdbc:h2:mem:${appName}\nspring.datasource.driver-class-name=org.h2.Driver\nspring.h2.console.enabled=true` : ''}
`,
    },
    {
      path: `src/test/java/${pkgPath}/${pascalName}ApplicationTests.java`,
      content: `package ${pkg};

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class ${pascalName}ApplicationTests {

    @Test
    void contextLoads() {
        // Verifies the Spring application context starts without errors
    }
}
`,
    },
    {
      path: `src/test/java/${pkgPath}/controller/HealthControllerTest.java`,
      content: `package ${pkg}.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(HealthController.class)
class HealthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void healthEndpointReturns200() throws Exception {
        mockMvc.perform(get("/health"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("ok"));
    }
}
`,
    },
    {
      path: 'Dockerfile',
      content: `# ── Build ────────────────────────────────────────────────────────────────────
FROM maven:3.9-eclipse-temurin-${javaVer} AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -q
COPY src ./src
RUN mvn package -DskipTests -q

# ── Runtime ───────────────────────────────────────────────────────────────────
FROM eclipse-temurin:${javaVer}-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
`,
    },
    {
      path: '.gitignore',
      content: `target/\n.mvn/\n.idea/\n*.iml\n*.class\n.DS_Store\n*.log\n`,
    },
    {
      path: 'README.md',
      content: `# ${pascalName}

${description || 'Spring Boot microservice.'}

## Stack

Java ${javaVer} · Spring Boot 3 · Maven · ${db !== 'h2' ? db.charAt(0).toUpperCase() + db.slice(1) + ' · ' : 'H2 (dev) · '}Docker

## Quick start

\`\`\`bash
./mvnw spring-boot:run
# http://localhost:8080
# http://localhost:8080/actuator/health
\`\`\`

## Tests

\`\`\`bash
mvn test
\`\`\`

## Docker

\`\`\`bash
docker build -t ${projectName} .
docker run -p 8080:8080 ${projectName}
\`\`\`
`,
    },
  ];
}

export const JAVA_SPRING_PREVIEW_VARS = {
  projectName: 'my-spring-service',
  appName:     'my_spring_service',
  pascalName:  'MySpringService',
  description: 'Spring Boot 3 microservice',
  config:      { javaVersion: '21', buildTool: 'maven', database: 'postgresql' },
};

export const JAVA_SPRING_META = {
  id:          'java-spring',
  label:       'Java Spring Boot',
  description: 'Java 21 · Spring Boot 3 · Maven · Actuator · Docker',
  fileCount:   9,
};
