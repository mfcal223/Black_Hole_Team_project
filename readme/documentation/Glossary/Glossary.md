<!-- AUTO-GENERATED — do not edit. Use the glossary CLI to make changes. -->

## Access Control

### Admin

**Term:** Admin

**Definition:** A privileged user role responsible for approving users, managing users, configuring OpenRouter credentials, and viewing usage or system data.

**Examples:** An admin configures the OpenRouter API key and approves employee accounts.

**Synonyms:** Administrator

**Related:** App Settings, Employee

---

### Employee

**Term:** Employee

**Definition:** An approved authenticated user who can use the chat interface and manage personal agents.

**Examples:** An employee logs in, selects an LLM model, and creates an agent for recurring work.

**Synonyms:** Approved User

**Related:** Agent, Ownership Scope

---

### Ownership Scope

**Term:** Ownership Scope

**Definition:** A rule that restricts data access to resources owned by the current authenticated user unless a feature explicitly allows broader access.

**Examples:** Employee agent list endpoints return only the agents owned by the authenticated employee.

**Synonyms:** Owner Scope, Ownership Enforcement

**Related:** Employee, Agent

---

## Backend Architecture

### App Settings

**Term:** App Settings

**Definition:** The singleton backend configuration record that stores system-wide settings such as the OpenRouter API key and default model.

**Examples:** App Settings stores a masked OpenRouter API key for admin responses and exposes the raw key internally for provider calls.

**Synonyms:** Application Settings, System Settings

**Related:** OpenRouter, Default Model

---

### Generic CRUD Scaffold

**Term:** Generic CRUD Scaffold

**Definition:** The shared controller, service, repository, and mapper pattern used to reduce boilerplate for standard domain resources.

**Examples:** Employee and Client CRUD use shared base classes while domain-specific rules stay in concrete services.

**Synonyms:** CRUD Scaffold

**Related:** Query Profile

---

### Query Profile

**Term:** Query Profile

**Definition:** The per-entity declaration of filterable and sortable fields used by QueryDSL-backed list endpoints.

**Examples:** EmployeeQueryProfile controls which Employee fields can be filtered or sorted through the list endpoint.

**Synonyms:** Entity Query Profile

**Related:** Generic CRUD Scaffold, QueryDSL

---

## LLM Routing

### Default Model

**Term:** Default Model

**Definition:** The model selected in App Settings as the fallback model for LLM requests when no explicit model is chosen.

**Examples:** If a chat request omits a model, the backend can use the configured default model.

**Synonyms:** Fallback Model

**Related:** LLM Model, App Settings

---

### LLM Model

**Term:** LLM Model

**Definition:** A selectable model record available for chat or image generation and admin configuration.

**Examples:** An admin enables a model and makes it available for employee chat requests.

**Synonyms:** Model

**Related:** Default Model, OpenRouter

---

### OpenRouter

**Term:** OpenRouter

**Definition:** The initial supported upstream LLM provider gateway used by AgentForge to access multiple models through one API.

**Examples:** The backend sends model requests to OpenRouter using the system API key from App Settings.

**Synonyms:** OpenRouter API

**Related:** Backend Gateway, LLM Model

---

## Product Domain

### Agent

**Term:** Agent

**Definition:** A saved system-prompt configuration that an approved user can create, name, select, and reuse for specialized LLM interactions.

**Examples:** An employee creates a Code Reviewer agent with a specific initial prompt.

**Synonyms:** Custom Agent

**Related:** Employee, Init Prompt, Recurrent Prompt

---

### Backend Gateway

**Term:** Backend Gateway

**Definition:** The Spring Boot backend boundary through which all LLM traffic must pass; clients never call OpenRouter directly.

**Examples:** Chat requests flow from frontend to backend to OpenRouter, with the backend enforcing access and usage tracking.

**Synonyms:** Gateway, Portal Backend

**Related:** OpenRouter, App Settings

---

### Self-Hosted Deployment

**Term:** Self-Hosted Deployment

**Definition:** A single-business installation controlled by the business, not a public multi-tenant SaaS.

**Examples:** The company owns API keys, users, deployment, and usage budgets for its AgentForge instance.

**Synonyms:** Private Deployment

**Related:** Backend Gateway, Admin

---

