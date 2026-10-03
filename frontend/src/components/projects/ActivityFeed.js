import { History } from 'lucide-react'
import { Avatar } from '../ui/Avatar'
import { Skeleton, EmptyState, ErrorState } from '../ui/Feedback'
import { useProjectActivity } from '../../hooks/queries'
import { relativeTime } from '../../lib/dates'

export default function ActivityFeed({ projectId, limit }) {
    const { data: items = [], isLoading, isError, error, refetch } = useProjectActivity(projectId, limit)

    if (isLoading) {
        return (
            <div className="activity">
                {Array.from({ length: Math.min(limit || 6, 6) }, (_, i) => (
                    <div key={i} className="activity__item"><Skeleton width={28} height={28} radius={14} /><Skeleton height={14} style={{ flex: 1 }} /></div>
                ))}
            </div>
        )
    }
    if (isError) return <ErrorState compact error={error} onRetry={refetch} />
    if (!items.length) return <EmptyState compact icon={History} title="No activity yet" description="Changes to this project and its tasks will appear here." />

    return (
        <ol className="activity">
            {items.map(item => (
                <li key={item._id} className="activity__item">
                    <Avatar user={item.actor} size={28} />
                    <div className="activity__body">
                        <p className="activity__message">{item.message}</p>
                        <time className="activity__time" dateTime={item.createdAt} title={new Date(item.createdAt).toLocaleString()}>
                            {relativeTime(item.createdAt)}
                        </time>
                    </div>
                </li>
            ))}
        </ol>
    )
}
