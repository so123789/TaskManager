import { UserPlus, ArrowRightLeft, MessageSquare, Clock, AlertTriangle, FolderOpen, Users } from 'lucide-react'
import { relativeTime } from '../../lib/dates'
import { cx } from '../../lib/utils'

const TYPE_META = {
    task_assigned: { icon: UserPlus, tone: 'accent' },
    task_status: { icon: ArrowRightLeft, tone: 'info' },
    task_comment: { icon: MessageSquare, tone: 'neutral' },
    deadline_soon: { icon: Clock, tone: 'warning' },
    overdue: { icon: AlertTriangle, tone: 'danger' },
    project_update: { icon: FolderOpen, tone: 'neutral' },
    project_member: { icon: Users, tone: 'accent' },
}

export default function NotificationItem({ notification, onOpen, actions }) {
    const meta = TYPE_META[notification.type] || TYPE_META.project_update
    const Icon = meta.icon
    return (
        <div className={cx('notification', !notification.read && 'is-unread')}>
            <button className="notification__main" onClick={() => onOpen(notification)}>
                <span className={`notification__icon notification__icon--${meta.tone}`}>
                    <Icon size={15} aria-hidden="true" />
                </span>
                <span className="notification__text">
                    <span className="notification__message">{notification.message}</span>
                    <span className="notification__meta">
                        {notification.project?.name && (
                            <>
                                <span className="project-swatch project-swatch--sm" style={{ background: notification.project.color }} />
                                <span className="truncate">{notification.project.name}</span>
                                <span aria-hidden="true">·</span>
                            </>
                        )}
                        <time dateTime={notification.createdAt}>{relativeTime(notification.createdAt)}</time>
                    </span>
                </span>
                {!notification.read && <span className="notification__unread" aria-label="Unread" />}
            </button>
            {actions}
        </div>
    )
}

// Opening a notification marks it read and jumps to the related task / project
export function createNotificationOpener({ markRead, openTask, navigate, onDone }) {
    return (notification) => {
        if (!notification.read) markRead({ id: notification._id, read: true })
        if (notification.task) openTask(notification.task)
        else if (notification.project) navigate(`/projects/${notification.project._id || notification.project}`)
        onDone?.()
    }
}
