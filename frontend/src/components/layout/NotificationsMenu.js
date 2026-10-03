import { Link, useNavigate } from 'react-router-dom'
import { Bell, CheckCheck, BellOff } from 'lucide-react'
import Menu from '../ui/Menu'
import { Skeleton, EmptyState, ErrorState } from '../ui/Feedback'
import NotificationItem, { createNotificationOpener } from '../notifications/NotificationItem'
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '../../hooks/queries'
import { useTaskModal } from '../../context/TaskModalContext'

export default function NotificationsMenu() {
    const { data, isLoading, isError, error, refetch } = useNotifications()
    const markRead = useMarkNotificationRead()
    const markAll = useMarkAllNotificationsRead()
    const { openTask } = useTaskModal()
    const navigate = useNavigate()
    const unread = data?.unreadCount || 0
    const items = (data?.items || []).slice(0, 8)

    return (
        <Menu
            panelClassName="notifications-panel"
            trigger={({ props }) => (
                <button className="icon-btn icon-btn--bordered" {...props} aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}>
                    <Bell size={17} />
                    {unread > 0 && <span className="icon-btn__badge">{unread > 9 ? '9+' : unread}</span>}
                </button>
            )}
        >
            {({ close }) => {
                const open = createNotificationOpener({ markRead: markRead.mutate, openTask, navigate, onDone: close })
                return (
                    <>
                        <div className="notifications-panel__header">
                            <h2>Notifications</h2>
                            {unread > 0 && (
                                <button className="text-btn" onClick={() => markAll.mutate()}>
                                    <CheckCheck size={14} /> Mark all read
                                </button>
                            )}
                        </div>
                        <div className="notifications-panel__list">
                            {isLoading ? (
                                Array.from({ length: 3 }, (_, i) => (
                                    <div key={i} className="notification"><Skeleton height={36} style={{ width: '100%' }} /></div>
                                ))
                            ) : isError ? (
                                <ErrorState compact error={error} onRetry={refetch} title="Couldn't load notifications" />
                            ) : items.length ? (
                                items.map(n => <NotificationItem key={n._id} notification={n} onOpen={open} />)
                            ) : (
                                <EmptyState compact icon={BellOff} title="You're all caught up" description="Assignments, comments and deadlines will show up here." />
                            )}
                        </div>
                        <Link to="/notifications" className="notifications-panel__footer" onClick={close}>
                            View all notifications
                        </Link>
                    </>
                )
            }}
        </Menu>
    )
}
