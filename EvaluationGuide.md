# 🏓 ft_transcendence — Evaluator Guide

This document is meant to help evaluators (even those who never did the project themselves) evaluate **ft_transcendence** at 42 School.  
It includes a project overview, red flags, and a full evaluation checklist.

---

## 🔑 What the project is
- **Goal**: Build a **web application** where users can play Pong.  
- Starts with a **mandatory baseline**:  
  - Pong game (local, 2 players, tournament system).  
  - Single Page Application (SPA) in **Typescript**.  
  - Backend optional, but if present → must be **pure PHP without frameworks** (unless overridden by modules).  
  - Must run with **Docker**, single command, self-contained.  
  - Must work in **Firefox latest**.  
  - Must be free of unhandled errors/warnings.  
  - Must implement **basic security**:
    - Hashed passwords.
    - HTTPS enabled.
    - Protection against SQL injection / XSS.
    - Form input validation.
    - No API keys or secrets in the repository (must be in `.env`).  

- After the baseline, they must complete **modules** (at least 7 majors to hit 100%):
  - **Web**: backend frameworks, frontend frameworks, DB, blockchain.
  - **User management**: accounts, OAuth.
  - **Gameplay**: remote play, multiplayer, new games, live chat.
  - **AI**: computer opponent.
  - **Cybersecurity**: 2FA, JWT, GDPR, WAF.
  - **DevOps**: logs, monitoring, microservices.
  - **Graphics**: 3D with Babylon.js.
  - **Accessibility**: multi-device, languages, SSR, visually impaired support.
  - **Server-side Pong**: API, CLI play.

---

## 🚩 Biggest Red Flags for Evaluation
When evaluating, you’re **not checking code style**, but functionality, compliance, and understanding.

### Mandatory Part
- ❌ Pong missing / not playable.
- ❌ No **tournament system** (matchmaking, aliases, rounds).
- ❌ SPA broken (reloads full page or back/forward buttons don’t work).
- ❌ Doesn’t run in **Docker with one command**.
- ❌ Doesn’t work in **Firefox**.
- ❌ Security issues:
  - Plaintext passwords.
  - SQL injection/XSS vulnerability.
  - Missing HTTPS/wss.
  - Credentials or API keys **in git repo** (must be in `.env` and ignored).
- ❌ Using forbidden frameworks/tools (e.g., React, Symfony, Express) without the proper module.

### Modules
- ❌ Team claims a module but hasn’t met its specific requirements (e.g., AI that does nothing, OAuth login not working, blockchain scores not actually stored).
- ❌ Using a library that basically solves the whole module (forbidden).
- ❌ Incomplete UX (remote play laggy and unhandled disconnects, live chat without blocking users, etc.).

---

## 📝 How to Evaluate
1. **Setup**:  
   - Clone repo, follow their instructions.  
   - Verify `docker-compose up` (or similar) runs everything with *one* command.  

2. **Mandatory basics**:  
   - Open in Firefox.  
   - Play Pong with 2 players.  
   - Run a tournament with aliases.  
   - Test browser navigation (back/forward).  
   - Look for console errors.  

3. **Security sanity checks**:  
   - If they have login: try entering `<script>alert(1)</script>` → must be blocked.  
   - Check `.gitignore` for `.env`.  
   - Ask how they hash passwords.  

4. **Modules** (pick at least 7 majors for full score):  
   - Ask them to demo each module.  
   - Ask how they implemented it and what tools they used.  
   - Verify they respect module-specific constraints (e.g., Node.js Fastify for backend module, SQLite for DB, Tailwind for frontend module).  

5. **Understanding**:  
   - Ask them to explain their architecture.  
   - Pick one module and ask: *“How does this work under the hood?”*  
   - They must show they **understand** and didn’t just copy/paste.  

---

# ✅ ft_transcendence Evaluation Checklist

## 🔹 1. Setup & Launch
- [ ] Repo clones without issue.  
- [ ] `.env` present locally, not pushed to git.  
- [ ] One command (`docker-compose up` or equivalent) launches everything.  
- [ ] Website runs correctly inside Docker (self-contained).  
- [ ] Works in **Firefox latest**.  

---

## 🔹 2. Mandatory Part
### Pong Game
- [ ] Pong runs locally in the browser.  
- [ ] Two players can play on the **same keyboard**.  
- [ ] Ball, paddles, and scoring behave consistently.  

### Tournament System
- [ ] Alias entry works (no persistent accounts required unless User Management module chosen).  
- [ ] Tournament organizes matchmaking.  
- [ ] Next match announcements are visible.  

### SPA Requirements
- [ ] No full page reloads → only dynamic updates.  
- [ ] Back/forward browser buttons work properly.  
- [ ] No unhandled **errors/warnings** in browser console.  

### Security Basics
- [ ] Passwords hashed (if backend & login present).  
- [ ] Input validation (try `<script>alert(1)</script>` → should be blocked).  
- [ ] Protected against SQL injection (if DB present).  
- [ ] HTTPS/wss enabled.  
- [ ] No API keys or secrets exposed in repo.  

⚠️ If any **mandatory requirement** fails → **STOP evaluation**. Modules and bonus don’t count.  

---

## 🔹 3. Modules (need at least 7 Majors for 100%)
For each claimed module:  
- [ ] Team explains **what they implemented**.  
- [ ] Demo works.  
- [ ] They followed the **constraints** (correct tech, not a shortcut library).  
- [ ] They can **explain how it works**.

### Common Modules Examples
- **Web Backend (Fastify, Node.js)**: [ ] Backend runs, endpoints exist.  
- **Frontend (Tailwind + TS)**: [ ] Tailwind styles visible.  
- **Database (SQLite)**: [ ] Data persists, queries work.  
- **User Management**: [ ] Register/login, avatars, friends, stats.  
- **OAuth (Google/GitHub)**: [ ] External login works.  
- **Remote Players**: [ ] Two players on separate machines.  
- **Multiplayer**: [ ] >2 players can play.  
- **Live Chat**: [ ] Messaging, blocking, invites, notifications.  
- **AI Opponent**: [ ] AI moves paddles (not idle, can win sometimes).  
- **Cybersecurity (2FA, JWT, WAF)**: [ ] Features implemented, explained.  
- **DevOps (logs, monitoring, microservices)**: [ ] Can show dashboards/logs or explain architecture.  
- **Graphics (Babylon.js 3D)**: [ ] 3D Pong works.  
- **Accessibility**: [ ] Responsive design, languages, accessibility features.  
- **Server-Side Pong (API/CLI)**: [ ] Pong logic server-side, playable via API or CLI.  

---

## 🔹 4. Understanding Check
Ask a few open questions:  
- [ ] *“Can you explain your overall architecture?”*  
- [ ] *“Why did you choose these modules?”*  
- [ ] *“How do you secure user input?”*  
- [ ] *“How does Docker isolate your app?”*  
- [ ] *“What would happen if your AI refreshed every frame instead of once per second?”*  

---

## 🔹 5. Bonus (Only if mandatory part is PERFECT)
- [ ] Bonus modules presented after main project works.  
- [ ] +5 points per minor, +10 per major.  

---

## 🔹 6. Final Notes
- [ ] Project runs fully inside Docker.  
- [ ] Team demonstrates **functionality + compliance + understanding**.  
- [ ] No forbidden libraries used.  

---
