// Black-box API test. Start the server against a throwaway database first, e.g.
//   MONGO_URI=mongodb://127.0.0.1:27017/taskmanager_test npm start
// then: npm run test:api   (BASE defaults to http://localhost:5000)
const BASE = process.env.BASE || 'http://localhost:5000'
let failures = 0
const check = (cond, label, extra) => {
    if (cond) console.log('  ok  ', label)
    else { failures++; console.log('  FAIL', label, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : '') }
}
async function call(method, path, body, token) {
    const res = await fetch(BASE + path, {
        method,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: body ? JSON.stringify(body) : undefined
    })
    let data = null
    try { data = await res.json() } catch {}
    return { status: res.status, data }
}
const stamp = Date.now()
const today = new Date().toISOString().slice(0, 10)

const a = await call('POST', '/api/auth/register', { name: 'Alice', email: `Alice${stamp}@test.dev`, password: 'secret1' })
check(a.status === 201 && a.data.token, 'register alice', a)
const b = await call('POST', '/api/auth/register', { name: 'Bob', email: `bob${stamp}@test.dev`, password: 'secret1' })
check(b.status === 201, 'register bob')
check((await call('POST', '/api/auth/register', { name: 'x', email: 'bad', password: 'secret1' })).status === 400, 'register invalid email -> 400')
check((await call('POST', '/api/auth/register', { name: 'x', email: `alice${stamp}@test.dev`, password: 'secret1' })).status === 400, 'duplicate email (case-insensitive) -> 400')
const login = await call('POST', '/api/auth/login', { email: `alice${stamp}@test.dev`, password: 'secret1' })
check(login.status === 200, 'login', login)
check((await call('POST', '/api/auth/login', { email: `alice${stamp}@test.dev`, password: 'nope' })).status === 400, 'bad login -> 400')
const A = a.data.token, B = b.data.token
const me = await call('GET', '/api/auth/me', null, A)
check(me.data?.user?.name === 'Alice' && !('password' in me.data.user), 'me', me)
check((await call('GET', '/api/auth/me', null, 'garbage')).status === 401, 'bad token -> 401')

// Projects
const p = await call('POST', '/api/projects', { name: 'Website Redesign', description: 'New site', priority: 'high', dueDate: today }, A)
check(p.status === 201 && p.data.progress === 0 && p.data.members.length === 1, 'create project', p)
const pid = p.data._id
check((await call('GET', `/api/projects/${pid}`, null, B)).status === 404, 'non-member cannot read project')
const add = await call('POST', `/api/projects/${pid}/members`, { email: `BOB${stamp}@test.dev` }, A)
check(add.status === 201 && add.data.members.length === 2, 'add member by email', add)
check((await call('POST', `/api/projects/${pid}/members`, { email: 'nobody@x.dev' }, A)).status === 404, 'add unknown member -> 404')
check((await call('DELETE', `/api/projects/${pid}`, null, B)).status === 403, 'member cannot delete project')

// Tasks
const bobId = b.data.user.id
const t1 = await call('POST', '/api/tasks', { title: 'Design hero', project: pid, assignees: [bobId], priority: 'urgent', labels: ['design', ' design ', 'ui'], dueDate: today, user: bobId }, A)
check(t1.status === 201 && t1.data.status === 'todo' && t1.data.labels.length === 2 && t1.data.user.name === 'Alice', 'create task (whitelist user, dedupe labels)', t1)
const t2 = await call('POST', '/api/tasks', { title: 'Personal errand', priority: 'low' }, A)
check(t2.status === 201 && t2.data.project === null, 'create personal task')
check((await call('POST', '/api/tasks', { title: 'x', assignees: [bobId] }, A)).status === 400, 'cannot assign non-member on personal task')
check((await call('POST', '/api/tasks', { title: '' }, A)).status === 400, 'empty title -> 400')
check((await call('POST', '/api/tasks', { title: 'x', priority: 'mega' }, A)).status === 400, 'bad priority -> 400')
const legacy = await call('POST', '/api/tasks', { title: 'Legacy client', categories: ['Food'] }, A)
check(legacy.data.labels?.[0] === 'Food', 'legacy categories -> labels')

const bobTasks = await call('GET', '/api/tasks', null, B)
check(bobTasks.data.length === 1 && bobTasks.data[0].title === 'Design hero', 'bob sees only project task', bobTasks.data.map?.(t => t.title))
const move = await call('PUT', `/api/tasks/${t1.data._id}`, { status: 'in_review', order: 5 }, B)
check(move.status === 200 && move.data.status === 'in_review' && move.data.completed === false, 'bob moves task (kanban)', move)
const done = await call('PUT', `/api/tasks/${t1.data._id}`, { status: 'completed' }, B)
check(done.data.completed === true && done.data.completedAt, 'complete syncs completed/completedAt')
const legacyToggle = await call('PUT', `/api/tasks/${t2.data._id}`, { completed: true }, A)
check(legacyToggle.data.status === 'completed', 'legacy completed toggle syncs status')
const reopen = await call('PUT', `/api/tasks/${t2.data._id}`, { completed: false }, A)
check(reopen.data.status === 'todo' && reopen.data.completedAt === null, 'reopen')
check((await call('GET', `/api/tasks/${t2.data._id}`, null, B)).status === 404, 'bob cannot see alice personal task')
check((await call('PUT', `/api/tasks/${t2.data._id}`, { title: 'hack' }, B)).status === 404, 'bob cannot edit alice personal task')
check((await call('DELETE', `/api/tasks/${t1.data._id}`, null, B)).status === 403, 'bob cannot delete task he did not create')

const c = await call('POST', `/api/tasks/${t1.data._id}/comments`, { text: 'Looks good!' }, B)
check(c.status === 201 && c.data.comments[0].author.name === 'Bob', 'comment', c)
check((await call('DELETE', `/api/tasks/${t1.data._id}/comments/${c.data.comments[0]._id}`, null, A)).status === 403, 'cannot delete others comment')

// Filters & sorting
const q = await call('GET', '/api/tasks?q=hero', null, A)
check(q.data.length === 1, 'search q', q.data.length)
const rx = await call('GET', '/api/tasks?q=' + encodeURIComponent('(.*'), null, A)
check(rx.status === 200, 'regex chars are escaped')
const pr = await call('GET', '/api/tasks?sort=priority&dir=asc', null, A)
check(pr.data[0].priority === 'urgent', 'sort by priority')
const lbl = await call('GET', '/api/tasks?label=ui', null, A)
check(lbl.data.length === 1, 'filter label')
const st = await call('GET', '/api/tasks?status=todo', null, A)
check(st.data.every(t => t.status === 'todo'), 'filter status')
const asg = await call('GET', `/api/tasks?assignee=${bobId}&project=${pid}`, null, A)
check(asg.data.length === 1 && asg.data[0].commentCount === 1, 'filter assignee+project, commentCount', asg.data)
const labels = await call('GET', '/api/tasks/labels', null, A)
check(labels.data.includes('design') && labels.data.includes('Food'), 'labels endpoint', labels.data)

// Dashboard & projects stats
const dash = await call('GET', `/api/dashboard?today=${today}&tz=%2B05:30`, null, A)
check(dash.status === 200 && dash.data.tasks.total === 3 && dash.data.tasks.completed === 1 && dash.data.weekly.length === 7, 'dashboard', dash.data)
check(dash.data.weekly[6].completed === 1, 'weekly completed today', dash.data.weekly)
const projects = await call('GET', '/api/projects', null, A)
check(projects.data[0].progress === 100 && projects.data[0].taskCount === 1, 'project progress', projects.data[0])

// Activity & notifications
const act = await call('GET', `/api/projects/${pid}/activity`, null, B)
check(act.data.length >= 4, 'activity', act.data.map?.(x => x.message))
const nb = await call('GET', `/api/notifications?today=${today}`, null, B)
check(nb.data.items.some(n => n.type === 'task_assigned') && nb.data.items.some(n => n.type === 'project_member'), 'bob notifications', nb.data.items.map(n => n.type))
const na = await call('GET', `/api/notifications?today=${today}`, null, A)
check(na.data.items.some(n => n.type === 'task_status') && na.data.items.some(n => n.type === 'task_comment'), 'alice notifications', na.data.items.map(n => n.type))

// Deadline sweep: overdue personal task
const od = await call('POST', '/api/tasks', { title: 'Overdue thing', dueDate: '2020-01-01' }, A)
const na2 = await call('GET', `/api/notifications?today=${today}`, null, A)
const na3 = await call('GET', `/api/notifications?today=${today}`, null, A)
check(na2.data.items.filter(n => n.type === 'overdue').length === 1 && na3.data.items.filter(n => n.type === 'overdue').length === 1, 'overdue notification deduped')
const overdueQ = await call('GET', `/api/tasks?due=overdue&today=${today}`, null, A)
check(overdueQ.data.length === 1 && overdueQ.data[0]._id === od.data._id, 'due=overdue filter')
const one = await call('PATCH', `/api/notifications/${na2.data.items[0]._id}`, { read: true }, A)
check(one.status === 200 && one.data.read === true, 'mark one read', one)
await call('PATCH', '/api/notifications/read-all', null, A)
const na4 = await call('GET', `/api/notifications?today=${today}`, null, A)
check(na4.data.unreadCount === 0, 'read all')

const team = await call('GET', '/api/users/team', null, A)
check(team.data.length === 2 && team.data[0].isMe && team.data[1].openTasks === 0, 'team', team.data)

// Member removal unassigns
await call('PUT', `/api/tasks/${t1.data._id}`, { status: 'todo' }, A)
const rm = await call('DELETE', `/api/projects/${pid}/members/${bobId}`, null, A)
check(rm.status === 200 && rm.data.members.length === 1, 'remove member')
const afterRm = await call('GET', `/api/tasks/${t1.data._id}`, null, A)
check(afterRm.data.assignees.length === 0, 'removed member unassigned')

// Profile & password
const upd = await call('PUT', '/api/auth/me', { name: 'Alice Smith' }, A)
check(upd.data.user.name === 'Alice Smith', 'update profile')
check((await call('PUT', '/api/auth/me/password', { currentPassword: 'wrong', newPassword: 'secret2' }, A)).status === 400, 'password change wrong current')
check((await call('PUT', '/api/auth/me/password', { currentPassword: 'secret1', newPassword: 'secret2' }, A)).status === 200, 'password change')

// Delete
check((await call('DELETE', `/api/tasks/${t2.data._id}`, null, A)).status === 200, 'delete task')
check((await call('DELETE', `/api/projects/${pid}`, null, A)).status === 200, 'delete project')
check((await call('GET', `/api/tasks/${t1.data._id}`, null, A)).status === 404, 'project tasks cascade-deleted')
check((await call('GET', '/api/tasks/not-an-id', null, A)).status === 404, 'invalid id -> 404')
check((await call('GET', '/api/nope', null, A)).status === 404, 'unknown route -> 404')

console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL PASSED')
process.exit(failures ? 1 : 0)
