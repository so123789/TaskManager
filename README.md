# TaskManager

A full-stack project and task management app: Kanban boards, list views, a shared calendar, team collaboration and in-app notifications.

**Stack:** React 19 · React Router 7 · TanStack Query · dnd-kit · Node.js · Express 5 · MongoDB / Mongoose · JWT auth

## Features

- **Dashboard.** Shows project and task totals, overdue work, a weekly productivity chart, the status breakdown, project progress and upcoming deadlines. The numbers are aggregated in MongoDB with a single `$facet` pipeline.
- **Projects.** Each project has its own workspace with Overview, Tasks, Board, Calendar and Activity tabs. Projects have a status, priority, due date, colour and members. The owner manages members; other members can leave.
- **Tasks.** Tasks can be created, edited, deleted, completed and reopened. Each task has a status (To Do, In Progress, In Review, Completed), a priority (Low to Urgent), a due date, labels, assignees and threaded comments. The task modal auto-saves each field and can be deep-linked with `?task=<id>`.
- **Kanban board.** Drag and drop works across and within columns with mouse, touch (long press) and keyboard (Space). Moves update the UI optimistically and roll back if the API call fails. Order is stored with fractional indexing, so a move usually updates a single task.
- **List view.** The table has inline status and priority pickers, row actions and pagination. On mobile it becomes a set of cards. The app remembers whether you last used Board or List.
- **Search, filters and sorting.** Filter by status, priority, assignee, project, due window and labels, and sort by created, updated, due date or priority. Search is debounced and runs on the server. All filters are kept in the URL, so filtered views can be shared and bookmarked.
- **Global search.** `Ctrl/⌘ + K` opens a command palette that searches tasks, projects and pages.
- **Calendar.** A month view shows status-coloured task pills and highlights overdue tasks. Selecting a day opens its agenda, where you can also add a task for that day.
- **Notifications.** You're notified about assignments, status changes, comments, project updates and being added to a project. Deadline reminders ("due today/tomorrow", "overdue") are generated with deduplication, and the bell refreshes by polling.
- **Auth.** Includes register, login, session restore through `/api/auth/me`, automatic logout when the token expires, profile editing and password change.
- **UX.** Skeleton loaders, empty and error states, and toast feedback throughout. Light, dark and system themes are supported, persisted, and applied before first paint.
- **Responsive.** Desktop has a collapsible sidebar, tablet uses an icon rail, and mobile uses a drawer. Modals become bottom sheets on mobile, and the board scrolls horizontally.

## Project structure

```
backend/
  models/          Task, Project, User, Activity, Notification
  routes/          auth, tasks, projects, notifications, dashboard, users
  utils/           access control, activity/notification fan-out, date helpers
  migrations.js    idempotent upgrades for documents from the first app version
  scripts/         API smoke test
frontend/src/
  api/             axios client (auth header, 401 handling) + endpoint wrappers
  hooks/           React Query hooks, URL-synced filters, debounce, media queries
  context/         auth, theme, toasts, task modal
  components/      ui primitives, layout shell, tasks, projects, calendar, charts
  Pages/           route-level pages (lazy loaded)
  styles/          design tokens, base, components, layout, app styles
```

## Getting started

Requirements: Node 18 or later, and MongoDB (local or Atlas).

```bash
# Backend
cd backend
cp .env.example .env        # set MONGO_URI and JWT_SECRET
npm install
npm run dev                 # http://localhost:5000

# Frontend
cd frontend
cp .env.example .env        # REACT_APP_API_URL=http://localhost:5000
npm install
npm start                   # http://localhost:3000
```

### Tests

```bash
cd frontend && npm test                  # unit tests (date logic, helpers)
cd backend  && npm run test:api          # API smoke test against a running server
```

Run the API test against a throwaway database, because it creates users, projects and tasks.

## API overview

All routes except register, login and the password reset routes require `Authorization: Bearer <token>`.

| Method | Route | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register`, `/api/auth/login` | Create account / sign in |
| GET / PUT | `/api/auth/me` | Current user / update profile |
| PUT | `/api/auth/me/password` | Change password |
| GET | `/api/tasks` | List tasks. Query: `q, status, priority, assignee, project, label, due, from, to, sort, dir` |
| POST / PUT / DELETE | `/api/tasks/:id` | Create / partial update / delete |
| POST / DELETE | `/api/tasks/:id/comments[/:commentId]` | Comments |
| GET | `/api/tasks/labels` | Labels used across your tasks |
| GET / POST / PUT / DELETE | `/api/projects[/:id]` | Projects, including progress stats |
| POST / DELETE | `/api/projects/:id/members[/:userId]` | Manage members |
| GET | `/api/projects/:id/activity` | Project activity feed |
| GET | `/api/dashboard` | Aggregated workspace stats |
| GET / PATCH / DELETE | `/api/notifications[/:id]`, `/read-all` | Notifications |
| GET | `/api/users/team` | Collaborators and their workload |

### Access model

You can see a task if you created it, are assigned to it, or belong to its project. Assignees must be members of the task's project. Only the task's creator or the project owner can delete a task. Request bodies are validated and whitelisted on the server.

## Notes

- Tasks created before projects existed are migrated automatically on server start. `completed` becomes `status` and `categories` become `labels`. The migration only touches documents that are missing the new fields.
- No email provider is configured yet. `forgot-password` returns a reset link only when `NODE_ENV` isn't `production`.
