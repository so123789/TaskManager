import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCheck, BellOff, Trash2, Circle, CheckCircle2 } from 'lucide-react'
import PageHeader from '../components/layout/PageHeader'
import Button from '../components/ui/Button'
import { SegmentedControl } from '../components/ui/Form'
import { Skeleton, EmptyState, ErrorState } from '../components/ui/Feedback'
import NotificationItem, { createNotificationOpener } from '../components/notifications/NotificationItem'
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead, useDeleteNotification } from '../hooks/queries'
import { useTaskModal } from '../context/TaskModalContext'

const FILTERS = [
    { value: 'all', label: 'All' },
    { value: 'unread', label: 'Unread' },
]

export default function Notifications() {
    const [filter, setFilter] = useState('all')
    const { data, isLoading, isError, error, refetch } = useNotifications({ limit: 100, ...(filter === 'unread' ? { unread: 'true' } : {}) })
    const markRead = useMarkNotificationRead()
    const markAll = useMarkAllNotificationsRead()
    const remove = useDeleteNotification()
    const { openTask } = useTaskModal()
    const navigate = useNavigate()
    const open = createNotificationOpener({ markRead: markRead.mutate, openTask, navigate })
    const items = data?.items || []

    return (
        <>
            <PageHeader
                title="Notifications"
                description="Assignments, status changes, comments and deadline reminders."
                actions={data?.unreadCount > 0 && (
                    <Button icon={CheckCheck} onClick={() => markAll.mutate()} loading={markAll.isPending}>Mark all as read</Button>
                )}
            />
            <div className="toolbar">
                <SegmentedControl options={FILTERS} value={filter} onChange={setFilter} label="Filter notifications" />
                {data && <span className="muted">{data.unreadCount} unread</span>}
            </div>

            <div className="card notification-page">
                {isError ? <ErrorState error={error} title="Couldn't load notifications" onRetry={refetch} />
                    : isLoading ? Array.from({ length: 5 }, (_, i) => <div key={i} className="notification"><Skeleton height={40} style={{ margin: 14, flex: 1 }} /></div>)
                    : items.length ? items.map(n => (
                        <NotificationItem
                            key={n._id}
                            notification={n}
                            onOpen={open}
                            actions={(
                                <div className="notification__actions">
                                    <button
                                        className="icon-btn icon-btn--sm"
                                        onClick={() => markRead.mutate({ id: n._id, read: !n.read })}
                                        aria-label={n.read ? 'Mark as unread' : 'Mark as read'}
                                        title={n.read ? 'Mark as unread' : 'Mark as read'}
                                    >
                                        {n.read ? <Circle size={15} /> : <CheckCircle2 size={15} />}
                                    </button>
                                    <button className="icon-btn icon-btn--sm" onClick={() => remove.mutate(n._id)} aria-label="Delete notification" title="Delete">
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            )}
                        />
                    ))
                    : (
                        <EmptyState
                            icon={BellOff}
                            title={filter === 'unread' ? 'No unread notifications' : "You're all caught up"}
                            description="When teammates assign you work, comment or deadlines approach, you'll see it here."
                        />
                    )}
            </div>
        </>
    )
}
