## Autonomous App Feature Generation Prompts

- Generate a contractor quote generator module including backend, frontend, and database schema, following Next.js + Tailwind + Prisma conventions.
- Create a lead capture form module with SMS/email notification integration and API endpoint.
- Build a dynamic project cost estimator that calculates quotes based on project type and square footage, and returns JSON responses.
- Scaffold a review automation system that can fetch Google reviews for a business and store them in a local database.
- Create a project management dashboard with sortable tables, charts, and task statuses using React + Tailwind.
- Add user authentication with JWT, password hashing, and session management for a SaaS app.
- Generate a reusable component library for Tailwind UI elements and store it in /templates/module_templates.
- Scaffold API endpoints for CRUD operations for a generic module with database migrations included.
- Create a real-time chat module using WebSockets or Socket.IO, fully connected to backend DB.

## AI Self-Improvement / Refactoring Prompts

- Analyze the current AI agent workflow and optimize patching logic for faster module creation.
- Refactor my task queue handling to prioritize urgent features and self-improvement tasks automatically.
- Scan the current codebase and suggest redundant or duplicated code to refactor.
- Review the frontend React components and convert class components to functional components where applicable.
- Generate unit tests for all backend endpoints automatically and report coverage.
- Optimize the AI agent’s prompt parsing logic for faster decision-making.
- Auto-generate changelog entries and action logs for every self-modification task.

## AI Autonomy / Agent Control Prompts

- As an autonomous AI, scan the repo for missing modules and suggest scaffolding tasks.
- Create a preview deployment for every new feature generated, including logs of build results.
- Analyze past task queue performance and reorder tasks to reduce average build/test time.
- Simulate a feature request from a user, then scaffold it fully autonomously and commit changes.
- Identify any broken dependencies in the project and auto-generate fixes or version updates.

## Full Module + App Scaffolding Prompts

- Scaffold an entire SaaS module with: frontend, backend API, database schema, automated tests, and Tailwind styling. Output in proper file structure.
- Generate a multi-module template in /templates/module_templates to reuse for future apps.
- Create a self-contained microservice with REST API endpoints, database models, and CI/CD preview deployment.
- Build a Next.js page that dynamically imports modules from /modules and updates the frontend automatically.

## Debugging / Code Fixing Prompts

- Scan backend code for possible runtime exceptions and propose patch fixes.
- Analyze the database schema and fix mismatched types or missing constraints.
- Check all frontend forms and ensure proper validation and error handling.
- Test all endpoints with sample requests and auto-generate fixes for failing tests.
- Scan for deprecated API calls and update them to the latest framework standards.

## AI Credit Maximization Strategy

- Batch multiple prompts in one session — feed Cursor 5–10 prompts at once to reduce token overhead.
- Use templates wherever possible — e.g., generate a template module first, then reuse it to generate multiple features.
- Prioritize self-improvement tasks early — optimizing the agent reduces credit usage for later builds.
- Autonomous looping — set Cursor to scaffold, build, and test in one session so each prompt produces actionable output without multiple calls.
- Include task queue references — e.g., "Check task_queue.json for next feature to implement" so the AI knows what to do next.

