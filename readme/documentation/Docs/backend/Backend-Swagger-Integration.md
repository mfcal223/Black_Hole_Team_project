---
tags: [docs, backend, swagger, openapi, api-design]
---

# Backend Swagger / OpenAPI Integration

> **Scope.** This document explains how the interactive API documentation (Swagger UI) is wired into the Spring Boot backend under `project/srcs/backend/`. It covers dependencies, the configuration class, the static initializer, the security bypass, and how springdoc auto-generates the OpenAPI spec.
>
> **Intended reader.** A developer who needs to understand why the Swagger UI works the way it does, or who wants to extend it (add authentication schemes, annotate controllers, change the UI behaviour).

---

## 1. Overview

The backend exposes an interactive REST API documentation at `/swagger-ui/index.html`. It is powered by two libraries:

| Library | Role |
|---------|------|
| `springdoc-openapi-starter-webmvc-api` | Scans Spring MVC controllers at startup and generates an OpenAPI 3 JSON spec, served at `/v3/api-docs` |
| `swagger-ui` (WebJar) | Provides the browser UI assets (JS/CSS) that render the spec interactively |

No `@Operation`, `@Tag`, or other Swagger annotations are required on controllers — the spec is generated automatically from standard Spring MVC annotations (`@RestController`, `@RequestMapping`, `@PathVariable`, `@RequestBody`, etc.).

---

## 2. Dependencies

`project/srcs/backend/pom.xml`

```xml
<!-- Generates /v3/api-docs from Spring MVC controllers -->
<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webmvc-api</artifactId>
    <version>2.8.17</version>
</dependency>

<!-- Swagger UI browser assets (served as a WebJar) -->
<dependency>
    <groupId>org.webjars</groupId>
    <artifactId>swagger-ui</artifactId>
    <version>5.17.14</version>
</dependency>
```

`springdoc-openapi-starter-webmvc-api` is the WebMVC-specific starter for Spring Boot 3. It registers the `/v3/api-docs` endpoint automatically via autoconfiguration but does **not** bundle a UI — that is the job of the swagger-ui WebJar.

---

## 3. Configuration Class

`src/main/java/com/BHT/configuration/SwaggerConfig.java`

```java
@Configuration
public class SwaggerConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/swagger-ui/**")
                .addResourceLocations(
                        "classpath:/static/swagger-ui/",
                        "classpath:/META-INF/resources/webjars/swagger-ui/5.17.14/")
                .resourceChain(false);
    }

    @Bean
    public OpenAPI openAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("AgentForge API")
                        .version("1.0.0")
                        .description("AgentForge Backend REST API"));
    }
}
```

### What each part does

**`addResourceHandlers`** — maps the `/swagger-ui/**` URL prefix to two classpath locations, in order:

1. `classpath:/static/swagger-ui/` — the project's own static directory (`src/main/resources/static/swagger-ui/`). Files here take precedence, so the custom `swagger-initializer.js` overrides the one bundled inside the WebJar.
2. `classpath:/META-INF/resources/webjars/swagger-ui/5.17.14/` — the WebJar, which provides `index.html`, `swagger-ui-bundle.js`, `swagger-ui.css`, and the rest of the UI assets.

`resourceChain(false)` disables the Spring resource chain (no fingerprinting/versioning transformations), which is correct for WebJar assets.

**`openAPI()` bean** — customises the top-level API metadata shown in the UI header. This is the only place to set the title, version, and description.

---

## 4. Custom Swagger Initializer

`src/main/resources/static/swagger-ui/swagger-initializer.js`

```js
window.onload = function() {
  window.ui = SwaggerUIBundle({
    url: "/v3/api-docs",
    dom_id: '#swagger-ui',
    presets: [
      SwaggerUIBundle.presets.apis,
      SwaggerUIStandalonePreset
    ],
    layout: "StandaloneLayout"
  });
};
```

This file overrides the default `swagger-initializer.js` that ships inside the WebJar. The key difference is the `url` field: it points to `/v3/api-docs` (the springdoc endpoint on this server) instead of the default petstore demo URL.

Because `classpath:/static/swagger-ui/` is listed first in the resource handler, Spring serves this file before ever looking into the WebJar.

---

## 5. Security Bypass

`src/main/java/com/BHT/configuration/security/SecurityConfig.java:63`

```java
.requestMatchers("/swagger-ui/**", "/v3/api-docs/**", "/swagger-ui.html").permitAll()
```

These three path patterns are whitelisted before JWT validation, so the Swagger UI and the OpenAPI JSON are accessible without a bearer token. All other API endpoints still require authentication/authorisation as configured by the rules that follow.

---

## 6. URL Reference

| URL | Content |
|-----|---------|
| `/swagger-ui/index.html` | Interactive Swagger UI |
| `/v3/api-docs` | Raw OpenAPI 3 JSON spec |
| `/v3/api-docs.yaml` | Same spec in YAML format |

The `/swagger-ui.html` path is also whitelisted but redirects to `/swagger-ui/index.html`.

---

## 7. How the Spec Is Generated

springdoc scans all beans annotated with `@RestController` at application startup. For each controller it inspects:

- HTTP method and path from `@GetMapping`, `@PostMapping`, etc.
- Request/response types from method signatures and `@RequestBody` / `@ResponseBody`
- Path variables from `@PathVariable`
- Query parameters from `@RequestParam`
- Response status from `@ResponseStatus`

No additional annotations are needed. If a controller method is not to be included in the spec, it can be excluded with `@Hidden` (from `io.swagger.v3.oas.annotations`).

---

## 8. Extending the Integration

### Add bearer token authentication to the UI

Add a `SecurityScheme` to the `OpenAPI` bean in `SwaggerConfig`:

```java
@Bean
public OpenAPI openAPI() {
    return new OpenAPI()
            .info(new Info().title("AgentForge API").version("1.0.0"))
            .components(new Components()
                    .addSecuritySchemes("bearerAuth",
                            new SecurityScheme()
                                    .type(SecurityScheme.Type.HTTP)
                                    .scheme("bearer")
                                    .bearerFormat("JWT")))
            .addSecurityItem(new SecurityRequirement().addList("bearerAuth"));
}
```

### Annotate a controller endpoint

```java
@Operation(summary = "Get agent by ID")
@ApiResponse(responseCode = "200", description = "Agent found")
@ApiResponse(responseCode = "404", description = "Agent not found")
@GetMapping("/{id}")
public AgentDTO getAgent(@PathVariable Long id) { ... }
```

These annotations are additive — they enrich the auto-generated spec without replacing it.

---

## Related Documents

- [[Backend-Architecture]] — overall layering and how controllers are structured
- [[Backend-Model-Anatomy]] — how domain models are defined (shapes the generated spec)
