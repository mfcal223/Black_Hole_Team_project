
## 🧠 1. Responsable 1 — Backend Core (explicado de verdad)

Este rol no es “hacer login y ya”.
Es construir la base sobre la que TODO el sistema corre.

Si lo hace mal → todo se rompe.
Si lo hace bien → el resto avanza rápido.

## 🔑 Qué construye exactamente
### 1. Sistema de autenticación
Login (/auth/login)
Registro (/auth/register)
Hash de contraseñas (bcrypt)
Generación de JWT

👉 Resultado: cualquier request puede saber quién eres

### 2. Sistema de autorización (MUY importante)

Define qué puede hacer cada usuario:

EMPLOYEE
MANAGER

Ejemplos:

Employee NO puede borrar agentes globales
Manager SÍ puede

👉 Esto se implementa con:

filtros / middleware
anotaciones tipo @PreAuthorize

### 3. Modelo base de usuarios

Implementa:

User entity
repositorio (JPA)
servicios (UserService)

### 4. Base del proyecto Spring Boot

Este rol también:

estructura el proyecto
configura:
paquetes (controller, service, repository)
manejo de errores global
validaciones (@Valid)
DTOs

👉 Básicamente crea el “esqueleto limpio”

### 5. Seguridad global del sistema
Configura Spring Security
Protege endpoints
Define qué rutas son públicas:
/auth/** → públicas
/api/** → protegidas

### 6. Multi-user awareness (clave en tu proyecto)

Todo en tu sistema depende del usuario:

agents → owner_id
workflows → owner_id
conversations → user_id

👉 Responsable 1 define cómo se obtiene el usuario actual en cada request.

Ejemplo:

SecurityContext.getCurrentUser()
📦 Qué NO hace (importante)

❌ No implementa agentes
❌ No hace workflows
❌ No hace UI
❌ No implementa tools

👉 Solo construye la base segura y consistente

🧱 Entregables claros del Responsable 1

Para que sea medible, debería entregar:

✅ Auth funcionando (login/register)
✅ JWT validándose en requests
✅ Roles funcionando (EMPLOYEE / MANAGER)
✅ Middleware de seguridad
✅ User entity + DB schema
✅ Base del proyecto limpia

# 🐳 2. Entonces… ¿quién hace Docker, Postgres, Nginx?

Aquí viene la clave:

👉 Esto NO debería ser responsabilidad de una sola persona full-time

Se divide así:

🧩 Opción recomendada (para equipo de 6)
🔧 Infra ligera compartida + owner claro

Asignás:

👉 1 persona como “DevOps owner” (part-time)
(normalmente el Responsable 1 o 2)

👤 DevOps Owner (20–30% de su tiempo)

Se encarga de:

🐳 Docker Compose
docker-compose.yml
servicios:
api
db
nginx
🗄️ PostgreSQL
levantar container
configurar conexión
variables de entorno

👉 PERO:

cada dev define sus propias entidades
🌐 Nginx
reverse proxy:
/api → backend
/ → frontend
🔒 Certbot (más adelante)
HTTPS
dominio
🧠 Regla clave

👉 Infraestructura = responsabilidad compartida, ownership claro

NO hagas esto:

❌ “nadie toca Docker”
❌ “solo uno sabe todo”
🔄 Cómo se conectan Backend Core + Infra

Responsable 1 trabaja MUY cerca del DevOps owner:

Ejemplo:

Responsable 1 define:

spring.datasource.url=jdbc:postgresql://db:5432/agentforge

DevOps define en docker-compose.yml:

services:
  db:
    image: postgres:16

👉 Se coordinan, no trabajan aislados.


# 🧭 División final clara (con infra incluida)
Persona	Rol	Infra
1	Backend Core (Auth + Security)	🔧 DevOps owner
2	Agent System	—
3	Workflow Engine	—
4	Tools + MCP	—
5	Conversations + Manager	—
6	Frontend	—

---

# ⚠️ Problema típico (y cómo evitarlo)
❌ “Nadie sabe cómo correr el proyecto”

Solución:

Desde semana 1:
- docker compose up
- debe funcionar.

# 🚀 Consejo práctico (muy importante)

Antes de escribir lógica compleja:

Día 1–2 hagan esto juntos:
levantar Postgres
levantar backend vacío
endpoint /health
conectar frontend básico

👉 Eso elimina el 50% de problemas futuros