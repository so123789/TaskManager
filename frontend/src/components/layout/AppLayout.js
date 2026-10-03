import { useState, useEffect, Suspense } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import CommandPalette from './CommandPalette'
import { PageLoader } from '../ui/Spinner'
import { TaskModalProvider } from '../../context/TaskModalContext'
import useLocalStorage from '../../hooks/useLocalStorage'
import { useIsMobile, useIsTablet } from '../../hooks/useMediaQuery'
import { cx } from '../../lib/utils'
import '../../styles/app.css'

// Desktop: full sidebar the user can collapse (remembered).
// Tablet: icon rail.  Mobile: off-canvas drawer opened from the top bar.
export default function AppLayout() {
    const isMobile = useIsMobile()
    const isTablet = useIsTablet()
    const [userCollapsed, setUserCollapsed] = useLocalStorage('tm:sidebar-collapsed', false)
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [searchOpen, setSearchOpen] = useState(false)
    const { pathname } = useLocation()

    const collapsed = isMobile ? false : isTablet ? true : userCollapsed

    useEffect(() => { setDrawerOpen(false) }, [pathname, isMobile])

    useEffect(() => {
        const onKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault()
                setSearchOpen(open => !open)
            }
        }
        document.addEventListener('keydown', onKeyDown)
        return () => document.removeEventListener('keydown', onKeyDown)
    }, [])

    useEffect(() => {
        document.body.style.overflow = drawerOpen ? 'hidden' : ''
        return () => { document.body.style.overflow = '' }
    }, [drawerOpen])

    return (
        <TaskModalProvider>
            <a href="#main" className="skip-link">Skip to content</a>
            <div className={cx('app', collapsed && 'app--collapsed', isMobile && 'app--mobile')}>
                <Sidebar
                    collapsed={collapsed}
                    canCollapse={!isMobile && !isTablet}
                    onToggleCollapse={() => setUserCollapsed(c => !c)}
                    mobile={isMobile}
                    open={drawerOpen}
                    onClose={() => setDrawerOpen(false)}
                />
                {isMobile && drawerOpen && <div className="drawer-backdrop" onClick={() => setDrawerOpen(false)} aria-hidden="true" />}

                <div className="app__main">
                    <Topbar mobile={isMobile} onOpenMenu={() => setDrawerOpen(true)} onOpenSearch={() => setSearchOpen(true)} />
                    <main className="app__content" id="main" tabIndex={-1}>
                        <Suspense fallback={<PageLoader />}>
                            <Outlet />
                        </Suspense>
                    </main>
                </div>
            </div>
            <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
        </TaskModalProvider>
    )
}
