import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { PageLoader } from './components/ui/Spinner'
import Login from './Pages/Login'

// Route-level code splitting: signed-out visitors only download the auth
// bundle, and each app page loads on first visit
const AppLayout = lazy(() => import('./components/layout/AppLayout'))
const Register = lazy(() => import('./Pages/Register'))
const ForgotPassword = lazy(() => import('./Pages/ForgotPassword'))
const ResetPassword = lazy(() => import('./Pages/ResetPassword'))
const Dashboard = lazy(() => import('./Pages/Dashboard'))
const MyTasks = lazy(() => import('./Pages/MyTasks'))
const Projects = lazy(() => import('./Pages/Projects'))
const ProjectDetail = lazy(() => import('./Pages/ProjectDetail'))
const CalendarPage = lazy(() => import('./Pages/CalendarPage'))
const Team = lazy(() => import('./Pages/Team'))
const Notifications = lazy(() => import('./Pages/Notifications'))
const Settings = lazy(() => import('./Pages/Settings'))
const NotFound = lazy(() => import('./Pages/NotFound'))

function ProtectedRoute({ children }) {
    const { status } = useAuth()
    const location = useLocation()
    if (status === 'loading') return <PageLoader />
    if (status === 'anonymous') {
        return <Navigate to="/" replace state={{ from: location.pathname + location.search }} />
    }
    return children
}

function PublicOnlyRoute({ children }) {
    const { status } = useAuth()
    if (status === 'loading') return <PageLoader />
    if (status === 'authenticated') return <Navigate to="/dashboard" replace />
    return children
}

function App() {
    return (
        <Suspense fallback={<PageLoader />}>
            <Routes>
                <Route path="/" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
                <Route path="/login" element={<Navigate to="/" replace />} />
                <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
                <Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPassword /></PublicOnlyRoute>} />
                <Route path="/reset-password" element={<PublicOnlyRoute><ResetPassword /></PublicOnlyRoute>} />

                <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/tasks" element={<MyTasks />} />
                    <Route path="/projects" element={<Projects />} />
                    <Route path="/projects/:projectId/:tab?" element={<ProjectDetail />} />
                    <Route path="/calendar" element={<CalendarPage />} />
                    <Route path="/team" element={<Team />} />
                    <Route path="/notifications" element={<Notifications />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="*" element={<NotFound />} />
                </Route>
            </Routes>
        </Suspense>
    )
}

export default App
