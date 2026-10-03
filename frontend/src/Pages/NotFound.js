import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { EmptyState } from '../components/ui/Feedback'

export default function NotFound() {
    return (
        <div className="not-found">
            <EmptyState
                icon={Compass}
                title="Page not found"
                description="The page you're looking for doesn't exist or has moved."
                action={<Link to="/" className="btn btn--primary btn--md">Go home</Link>}
            />
        </div>
    )
}
