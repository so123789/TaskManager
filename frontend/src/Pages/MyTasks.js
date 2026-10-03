import { Plus } from 'lucide-react'
import PageHeader from '../components/layout/PageHeader'
import Button from '../components/ui/Button'
import TaskWorkspace from '../components/tasks/TaskWorkspace'
import { useTaskModal } from '../context/TaskModalContext'

export default function MyTasks() {
    const { createTask } = useTaskModal()
    return (
        <>
            <PageHeader
                title="My Tasks"
                description="Everything you created, are assigned to, or can see in your projects."
                actions={<Button variant="primary" icon={Plus} onClick={() => createTask()}>New task</Button>}
            />
            <TaskWorkspace storageKey="my-tasks" />
        </>
    )
}
