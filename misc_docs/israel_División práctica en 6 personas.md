# 🧩 División práctica en 6 personas

1. 🧠 Backend Core (Auth + Users + Roles)

Responsable 1

Se encarga de todo lo base del sistema:

User
autenticación (JWT)
roles (EMPLOYEE / MANAGER)
permisos
seguridad básica

👉 Este módulo desbloquea TODO lo demás.

Incluye:

Login / register
Middleware de auth
RBAC (role-based access control)
Base del proyecto Spring Boot

2. 🤖 Agent System (núcleo del producto)

Responsable 2

El corazón de AgentForge:

Agent
AgentCapability
ejecución de agentes (LangChain4j / Spring AI)

👉 Este es el sistema más importante.

Incluye:

CRUD de agentes
System prompts
asignación de tools / skills / MCP
ejecución de un agente simple

3. 🔗 Workflow Engine

Responsable 3

Toda la lógica de automatización:

Workflow
WorkflowStep
ejecución encadenada

👉 Esto es básicamente un “mini Zapier interno”.

Incluye:

motor de ejecución secuencial
input/output mapping
control de errores
WorkflowExecution + WorkflowStepExecution
4. 🧰 Tools + MCP + Plugins

Responsable 4

Toda la capa extensible:

Tool
MCPServer
sistema de plugins

👉 Este módulo es crítico pero puede desarrollarse en paralelo.

Incluye:

ejecución de tools
integración MCP
loader de plugins (/plugins)
abstracción de capacidades
5. 💬 Conversations + Manager Agent

Responsable 5

Toda la experiencia del usuario:

Conversation
Message
Manager Agent orchestration

👉 Esto conecta TODO el sistema.

Incluye:

chat
streaming (WebSocket)
lógica del Manager Agent:
seleccionar agentes
orquestar llamadas
historial de conversaciones
6. 🎨 Frontend (React)

Responsable 6

Toda la UI:

👉 Idealmente alguien full frontend.

Pantallas clave:

login
dashboard
chat (tipo ChatGPT)
builder de agentes
builder de workflows
explorer (global pool)
analytics (manager)
🔗 Cómo se conectan (IMPORTANTE)

Cada persona trabaja independiente si definís contratos claros:

APIs clave (acordarlas antes)
/auth/*
/agents/*
/workflows/*
/tools/*
/conversations/*

💡 Consejo: definan esto juntos el día 1.

⚙️ División alternativa (si son niveles mixtos)

Si hay juniors, podés ajustar:

Seniors (3 personas)
Agent System
Workflow Engine
Tools/MCP
Mid/Junior (3 personas)
Auth + Users
Frontend
Conversations (más guiado)
🚧 Orden recomendado (para no bloquearse)

No empiecen todos a la vez en todo.

Fase 1 (Semana 1–2)
Auth (1)
Agent CRUD (2)
Frontend base (6)
Fase 2
Agent execution (2)
Conversations básicas (5)
Fase 3
Workflows (3)
Tools/MCP (4)
Fase 4
Manager Agent inteligente (5)
Analytics + polish
⚠️ Errores comunes (evítenlos)
❌ “Todos hacemos de todo” → caos
❌ No definir APIs → bloqueos constantes
❌ Frontend esperando backend → pérdida de tiempo
❌ Hacer workflows antes de agents → mala base
❌ Sobre-ingeniería en plugins desde el día 1
🧠 Consejo clave

Este proyecto tiene 3 núcleos reales:

Agents
Workflows
Manager orchestration

Si esos 3 funcionan → el producto vive
Si fallan → todo lo demás es irrelevante