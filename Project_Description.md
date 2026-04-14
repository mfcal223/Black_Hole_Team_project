# Black Hole Team - 1st Meeting

## GOAL

- We need to build a complete real-world web application (a full product)
- It includes with frontend + backend + database, real users handling and real-time interactions ---> architecture + deployment + security
- The idea is ours, 
- It must follow strict technical and evaluation rules.

## 🧱 Mandatory foundation (non-negotiable)  

#### 🖥️ Core architecture
* Frontend (UI): Frontend frameworks: React, Vue, Angular, Svelte, Next.js
* Backend (logic, API): Express, Fastify, NestJS, Django, Flask, Ruby on Rails.  
* Database (persistent data)*

> Not frameworks: jQuery (library), Lodash (utility library), Axios (HTTP client).  

#### 🔐 Must-have features
* User signup/login (secure)
* Input validation (frontend + backend)
* Multi-user support (simultaneous users)
* Real-time behavior (when relevant)

From the subject: 
* A frontend that is clear, responsive, and accessible across all devices.
* Use a `CSS framework` or styling solution of your choice (e.g., Tailwind CSS, Bootstrap, Material-UI, Styled Components, etc.).
*  Store credentials (API keys, environment variables, etc.) in a local .env file that is ignored by Git, and provide an .env.example file. 
*  The database must have a clear schema and well-defined relations.
*  Your application must have a basic user management system. Users must be able to sign up and log in securely:  
      *  At minimum: email and password authentication with proper security (hashed passwords, salted, etc.).
      *  Additional authentication methods (OAuth, 2FA, etc.) can be implemented via modules.
* All forms and user inputs must be properly validated in both the frontend and backend. 
* For the backend, HTTPS must be used everywhere.

#### ⚙️ Engineering requirements
* Git with proper commits (all members contribute)
* Docker (run project with ONE command)
* No browser errors
* Chrome compatibility

#### 📄 Legal requirement (VERY important)
* Privacy Policy
* Terms of Service
* README file

⚠️ Missing these = automatic failure

---

## Modules & Points
| Module                              | Type  | Points |
| ----------------------------------- | ----- | ------ |
| Web frameworks (frontend + backend) | Major | 2      |
| Real-time features                  | Major | 2      |
| Web-based game                      | Major | 2      |
| User management                     | Major | 2      |
| ORM                                 | Minor | 1      |
| OAuth                               | Minor | 1      |
| Tournament                          | Minor | 1      |
| AI opponent                         | Major | 2      |
| File upload                         | Minor | 1      |
| **TOTAL**                           |       | **14** |

> ⚠️ CRITICAL RULE : ❗ If a module is NOT fully working → 0 point.  
> Team has to be able to `Demonstrate it` + `Explain it` + `Defend it`

### Module Categories 
The categories are just groups. What gives us points are the individual modules inside each category.

#### Category: Web
✅ Use frontend + backend framework → Major (2 pts)  
✅ Real-time features → Major (2 pts)  
✅ User interaction (chat, friends) → Major (2 pts)  
✅ ORM = Object-Relational Mapping for the database (instead of SQL use a proper ORM library)→ Minor (1 pt)  
✅ File upload → Minor (1 pt)  

**ORM examples**
| Tech          | ORM                     |
| ------------- | ----------------------- |
| Java (Spring) | Hibernate / JPA         |
| Node.js       | Prisma / TypeORM        |
| Python        | Django ORM / SQLAlchemy |

> 👉 If the team uses Spring Boot → ORM = Hibernate (JPA)

#### Category: Gaming and user experience
✅ Web-based game → Major  
✅ Remote players → Major  
✅ Tournament → Minor  
✅ Multiplayer 3+ → Major  

#### Category: User Management
✅ Standard user system → Major  
✅ OAuth → Minor  ---> **OAuth** = a way to log in using another service (ex. Login with Google)  
✅ 2FA → Minor  
✅ Permissions system → Major  

#### Category: Artificial Intelligence
✅ AI opponent → Major  
✅ Recommendation system → Major  


**Mapping Project <-> Module**
| Category           | Module (from subject)                      | Type  | Points |
| ------------------ | ------------------------------------------ | ----- | ------ |
| 🌐 Web             | Use framework (frontend + backend)         | Major | 2      |
| 🌐 Web             | Real-time features (WebSockets)            | Major | 2      |
| 🌐 Web             | User interaction (chat, friends, profiles) | Major | 2      |
| 🎮 Gaming          | Web-based game                             | Major | 2      |
| 🎮 Gaming          | Remote players                             | Major | 2      |
| 👤 User Management | Standard user management                   | Major | 2      |
| 🌐 Web             | ORM                                        | Minor | 1      |
| 👤 User Management | OAuth                                      | Minor | 1      |
| 🎮 Gaming          | Tournament system                          | Minor | 1      |
| 🤖 AI              | AI opponent                                | Major | 2      |
| 🌐 Web             | File upload system                         | Minor | 1      |


---

## Team Organization (MANDATORY for the evaluation)
Define these roles:
| Role            | Responsibility      |
| --------------- | ------------------- |
| Product Owner   | decides features    |
| Project Manager | organizes work      |
| Tech Lead       | architecture & tech |
| Developers      | implement           |

> 📌 Everyone codes, but roles must exist

At the end, the team has to be able to answer:
* Who did what?
* How did you organize?
* Why did you choose this tech?
* How does your system work?

👉 Everyone must be able to explain EVERYTHING.

---

# Project Ideas and Examples

The subject does NOT force a specific project — it gives examples. The real goal is to pick something that allows us to implement enough modules and is realistic for our team.

To consider: 
👉 Does it support multi-user interaction?
👉 Can we add real-time features?
👉 Can we reach 14 points without overcomplicating?

| Project Type | Example Project         | Short Description                                                             |
| ------------ | ----------------------- | ----------------------------------------------------------------------------- |
| 🎮 Gaming    | Multiplayer Pong        | Classic Pong game with online matches, tournaments, and optional AI opponents |
| 🎮 Gaming    | Online Chess Platform   | Real-time chess with matchmaking, rankings (ELO), and spectator mode          |
| 🎮 Gaming    | Card Game Arena         | Multiplayer card games (Poker, Uno…) with tournaments and leaderboards        |
| 🎮 Gaming    | Battle Royale Mini-Game | Simple browser-based survival game with multiple players                      |
| 🎮 Gaming    | Trivia / Quiz Platform  | Real-time quiz game with categories, multiplayer competition, and scoring     |

| Project Type              | Example Project            | Short Description                                                       |
| ------------------------- | -------------------------- | ----------------------------------------------------------------------- |
| 🌐 Social / Collaborative | Social Network             | Profiles, posts, comments, likes, friends, and real-time chat           |
| 🌐 Social / Collaborative | Collaborative Workspace    | Shared documents, team chat, file sharing, and project management tools |
| 🌐 Social / Collaborative | Forum Platform             | Discussion boards with threads, moderation, and user reputation         |
| 🌐 Social / Collaborative | Event Management Platform  | Create/manage events, RSVP system, notifications, and calendar features |
| 🌐 Social / Collaborative | Learning Management System | Courses, assignments, quizzes, and student–teacher interaction          |

| Project Type        | Example Project          | Short Description                                                  |
| ------------------- | ------------------------ | ------------------------------------------------------------------ |
| 🎨 Creative / Media | Music Streaming Platform | Upload, stream music, create playlists, and social interaction     |
| 🎨 Creative / Media | Video Sharing Platform   | Upload/watch videos with comments, likes, and recommendations      |
| 🎨 Creative / Media | Art Gallery              | Share artwork with galleries, likes, comments, and artist profiles |
| 🎨 Creative / Media | Blogging Platform        | Create and publish blog posts with tags, comments, and engagement  |
| 🎨 Creative / Media | Recipe Sharing Platform  | Share recipes, ratings, meal planning, and shopping lists          |

| Project Type             | Example Project             | Short Description                                                  |
| ------------------------ | --------------------------- | ------------------------------------------------------------------ |
| 🛠️ Productivity / Tools | Task Management System      | Manage tasks, deadlines, team collaboration, and progress tracking |
| 🛠️ Productivity / Tools | Code Collaboration Platform | Share code, collaborate in real time, and discuss implementations  |
| 🛠️ Productivity / Tools | Booking System              | Reserve rooms/resources with scheduling and notifications          |
| 🛠️ Productivity / Tools | Marketplace Platform        | Buy/sell items with messaging, ratings, and search features        |
| 🛠️ Productivity / Tools | Fitness Tracker             | Track workouts, progress, challenges, and leaderboards             |

| Project Type   | Example Project            | Short Description                                                 |
| -------------- | -------------------------- | ----------------------------------------------------------------- |
| 🎯 Specialized | Trading Simulator          | Simulate stock/crypto trading with real-time data and portfolios  |
| 🎯 Specialized | Language Learning Platform | Lessons, exercises, progress tracking, and peer interaction       |
| 🎯 Specialized | Pet Adoption Platform      | Browse pets, manage adoption process, user profiles, messaging    |
| 🎯 Specialized | Travel Planning Platform   | Plan trips, share itineraries, recommendations, and collaboration |
| 🎯 Specialized | Crowdfunding Platform      | Create campaigns, manage donations, and engage with community     |
