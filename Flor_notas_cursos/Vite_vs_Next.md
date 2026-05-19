
1- Vite or Next?

My recommendation: use Vite for Transcendence

For your team and project, I would choose:

React + Vite + Tailwind + shadcn/ui

not Next.js.

Why?

Because your Transcendence architecture seems to be:

Frontend React app
        ↓
calls backend API
        ↓
backend handles auth, users, agents, database, etc.

That fits very well with Vite.

Vite is a fast frontend build tool for React apps, while Next.js is a bigger full React framework with server-side features. Vite’s own docs describe it as a frontend build tool, and shadcn officially supports both Vite and Next.js.

| Reason                       | Why it matters                                      |
| ---------------------------- | --------------------------------------------------- |
| Simpler mental model         | Easier for a beginner frontend team                 |
| Clear backend/frontend split | Your backend already exists separately              |
| Good for dashboards          | Transcendence sounds like an internal app/dashboard |
| Easier deployment in Docker  | Static frontend build can be served by Nginx        |
| Works with shadcn/ui         | shadcn has an official Vite setup                   |
| Less magic                   | Fewer Next.js-specific rules to learn               |


When I would choose Next.js instead

I would choose Next.js if your project needed:

server-side rendering
SEO-heavy public pages
React Server Components
backend routes inside the frontend project
fullstack frontend/backend in one framework
file-based routing managed by Next.js

But for your Transcendence case, those features are probably not necessary and may add complexity.

routing is one of the areas where:

Next.js feels MUCH easier initially

because routing is built into the framework.

You simply create folders/files:

app/
 ├── page.js
 ├── dashboard/
 │    └── page.js
 └── profile/
      └── page.js

and Next.js automatically creates:

/
/dashboard
/profile

That is called:

File-based routing

Very beginner-friendly.

With Vite, Routing Is Manual

Vite itself does NOT include routing.

You add it yourself using:

React Router

which is the standard routing library for React.

Is It Hard?

Honestly?

No.

It is only slightly more setup.

After setup, usage becomes very similar conceptually.

What You Need in Vite

You install React Router:

npm install react-router-dom

Then you manually define routes.

Typical Vite Routing Structure

Example:

src/
├── components/
│    └── Header.jsx
├── pages/
│    ├── Home.jsx
│    ├── Dashboard.jsx
│    └── Profile.jsx
├── App.jsx
└── main.jsx
Example Vite Routing
App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
Header Links

Then in your header:

import { Link } from "react-router-dom";

function Header() {
  return (
    <nav>
      <Link to="/">Home</Link>
      <Link to="/dashboard">Dashboard</Link>
      <Link to="/profile">Profile</Link>
    </nav>
  );
}
Conceptually It Is Almost The Same
Next.js
Create file
→ route exists automatically
Vite + React Router
Create component
→ manually register route

That is basically the difference.

Why Many Teams Still Use Vite

Even though Next.js routing is nicer initially, Vite is still extremely popular because:

simpler architecture
less framework complexity
less “magic”
easier frontend/backend separation
better for SPAs
easier for beginners to debug
For Your Transcendence Dashboard

Honestly, your architecture already sounds VERY React Router-like:

Sidebar
Header
Router Area

That is basically:

<Sidebar />
<Header />
<Routes>
  ...
</Routes>

which is a classic Vite + React Router SPA architecture.

Important Difference
Next.js

Routes are tied to:

folders
server rendering system
app router conventions
React Router

Routes are just React components.

Very flexible.

Learning Difficulty

Considering your current progress:

components
props
hooks
state
conditional rendering

I honestly think:

React Router would take you maybe 1–2 days to feel comfortable with
the basics are not hard

Especially because:

you already understand component trees
parent/child relationships
rendering logic
One Very Important Observation

You said:

“with next.js it is VERY simple”

That is true.

But there is a tradeoff:

Simplicity vs Control

Next.js gives:

more automation
more conventions
more framework rules

Vite gives:

more manual setup
more transparency
simpler mental model internally

For a learning/team environment, that can actually be beneficial.