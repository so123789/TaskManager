import { useState, useMemo } from 'react'
import { FolderPlus, FolderKanban, Search, SearchX } from 'lucide-react'
import PageHeader from '../components/layout/PageHeader'
import Button from '../components/ui/Button'
import { Input, Select, SegmentedControl } from '../components/ui/Form'
import { EmptyState, ErrorState } from '../components/ui/Feedback'
import ProjectCard, { ProjectCardSkeleton } from '../components/projects/ProjectCard'
import ProjectModal from '../components/projects/ProjectModal'
import { useProjects } from '../hooks/queries'
import useLocalStorage from '../hooks/useLocalStorage'
import { PROJECT_STATUSES } from '../lib/constants'

const SORTS = [
    { value: 'updated', label: 'Recently updated' },
    { value: 'name', label: 'Name' },
    { value: 'due', label: 'Due date' },
    { value: 'progress', label: 'Progress' },
]

const sorters = {
    updated: (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt),
    name: (a, b) => a.name.localeCompare(b.name),
    due: (a, b) => (a.dueDate ? new Date(a.dueDate) : Infinity) - (b.dueDate ? new Date(b.dueDate) : Infinity),
    progress: (a, b) => b.progress - a.progress,
}

export default function Projects() {
    const { data: projects = [], isLoading, isError, error, refetch } = useProjects()
    const [creating, setCreating] = useState(false)
    const [search, setSearch] = useState('')
    const [status, setStatus] = useState('all')
    const [sort, setSort] = useLocalStorage('tm:projects-sort', 'updated')

    const counts = useMemo(() => projects.reduce((acc, p) => ({ ...acc, [p.status]: (acc[p.status] || 0) + 1 }), {}), [projects])
    const visible = useMemo(() => {
        const q = search.trim().toLowerCase()
        return projects
            .filter(p => status === 'all' || p.status === status)
            .filter(p => !q || p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q))
            .sort(sorters[sort] || sorters.updated)
    }, [projects, search, status, sort])

    const statusOptions = [
        { value: 'all', label: `All ${projects.length ? projects.length : ''}`.trim() },
        ...PROJECT_STATUSES.map(s => ({ value: s.value, label: `${s.label}${counts[s.value] ? ` ${counts[s.value]}` : ''}` })),
    ]

    return (
        <>
            <PageHeader
                title="Projects"
                description="Track progress, deadlines and ownership across every initiative."
                actions={<Button variant="primary" icon={FolderPlus} onClick={() => setCreating(true)}>New project</Button>}
            />

            {projects.length > 0 && (
                <div className="toolbar">
                    <div className="toolbar__search">
                        <Input icon={Search} type="search" placeholder="Search projects…" value={search} onChange={e => setSearch(e.target.value)} aria-label="Search projects" />
                    </div>
                    <div className="toolbar__scroll">
                        <SegmentedControl options={statusOptions} value={status} onChange={setStatus} label="Filter by status" />
                    </div>
                    <Select className="toolbar__sort" value={sort} onChange={e => setSort(e.target.value)} options={SORTS} aria-label="Sort projects" />
                </div>
            )}

            {isError ? (
                <div className="card"><ErrorState error={error} title="Couldn't load projects" onRetry={refetch} /></div>
            ) : isLoading ? (
                <div className="project-grid">{[1, 2, 3, 4, 5, 6].map(i => <ProjectCardSkeleton key={i} />)}</div>
            ) : !projects.length ? (
                <div className="card">
                    <EmptyState
                        icon={FolderKanban}
                        title="No projects yet"
                        description="Create your first project to get started."
                        action={<Button variant="primary" icon={FolderPlus} onClick={() => setCreating(true)}>Create project</Button>}
                    />
                </div>
            ) : visible.length ? (
                <div className="project-grid">{visible.map(p => <ProjectCard key={p._id} project={p} />)}</div>
            ) : (
                <div className="card">
                    <EmptyState
                        icon={SearchX}
                        title="No matching projects"
                        description="Try a different search or status filter."
                        action={<Button onClick={() => { setSearch(''); setStatus('all') }}>Reset filters</Button>}
                    />
                </div>
            )}

            <ProjectModal open={creating} onClose={() => setCreating(false)} />
        </>
    )
}
