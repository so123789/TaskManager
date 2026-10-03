import PageHeader from '../components/layout/PageHeader'
import CalendarMonth from '../components/calendar/CalendarMonth'

export default function CalendarPage() {
    return (
        <>
            <PageHeader title="Calendar" description="Every task with a due date, across all of your projects." />
            <CalendarMonth />
        </>
    )
}
