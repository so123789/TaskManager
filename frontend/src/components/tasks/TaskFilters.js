import { useEffect, useState } from 'react'
import { Search, SlidersHorizontal, ArrowUpDown, X, ArrowUp, ArrowDown } from 'lucide-react'
import Menu, { MenuItem, MenuLabel, MenuDivider } from '../ui/Menu'
import { Input, Select } from '../ui/Form'
import Button from '../ui/Button'
import { StatusDot, PriorityIcon } from '../ui/Badge'
import useDebounce from '../../hooks/useDebounce'
import { splitList } from '../../hooks/useTaskFilters'
import { useLabels, useProjects, useTeam } from '../../hooks/queries'
import { TASK_STATUSES, PRIORITIES, SORT_OPTIONS, DUE_FILTERS, STATUS_LABEL, PRIORITY_LABEL } from '../../lib/constants'
import { cx } from '../../lib/utils'

function ToggleChips({ options, selected, onChange, renderIcon }) {
    const toggle = (value) => onChange(selected.includes(value) ? selected.filter(v => v !== value) : [...selected, value])
    return (
        <div className="toggle-chips">
            {options.map(o => (
                <button
                    key={o.value}
                    type="button"
                    className={cx('toggle-chip', selected.includes(o.value) && 'is-active')}
                    aria-pressed={selected.includes(o.value)}
                    onClick={() => toggle(o.value)}
                >
                    {renderIcon?.(o.value)}
                    {o.label}
                </button>
            ))}
        </div>
    )
}

export default function TaskFilters({ filters, setFilter, setFilters, clearFilters, activeCount, scopedProject, viewSwitcher, hideStatus }) {
    const [search, setSearch] = useState(filters.q || '')
    const debouncedSearch = useDebounce(search, 300)
    const { data: labels = [] } = useLabels()
    const { data: projects = [] } = useProjects()
    const { data: team = [] } = useTeam()

    // Push the debounced search term into the URL (and therefore the query)
    useEffect(() => {
        if ((filters.q || '') !== debouncedSearch.trim()) setFilter('q', debouncedSearch.trim())
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch])

    // Keep the box in sync when filters are cleared elsewhere
    useEffect(() => {
        if (!filters.q) setSearch(s => (s.trim() ? '' : s))
    }, [filters.q])

    const statuses = splitList(filters.status)
    const priorities = splitList(filters.priority)
    const selectedLabels = splitList(filters.label)
    const sort = filters.sort || 'createdAt'
    const dir = filters.dir || (sort === 'createdAt' || sort === 'updatedAt' ? 'desc' : 'asc')
    const projectName = (id) => projects.find(p => p._id === id)?.name || 'Project'
    const personName = (id) => (id === 'me' ? 'Me' : id === 'unassigned' ? 'Unassigned' : team.find(u => u._id === id)?.name || 'Member')

    const assigneeOptions = [
        { value: 'me', label: 'Assigned to me' },
        { value: 'unassigned', label: 'Unassigned' },
        ...team.filter(u => !u.isMe).map(u => ({ value: u._id, label: u.name })),
    ]

    const chips = [
        ...statuses.map(s => ({ key: `s-${s}`, label: STATUS_LABEL[s], remove: () => setFilter('status', statuses.filter(x => x !== s)) })),
        ...priorities.map(p => ({ key: `p-${p}`, label: `${PRIORITY_LABEL[p]} priority`, remove: () => setFilter('priority', priorities.filter(x => x !== p)) })),
        ...(filters.assignee ? [{ key: 'a', label: personName(filters.assignee), remove: () => setFilter('assignee', '') }] : []),
        ...(filters.project && !scopedProject ? [{ key: 'pr', label: filters.project === 'none' ? 'No project' : projectName(filters.project), remove: () => setFilter('project', '') }] : []),
        ...(filters.due ? [{ key: 'd', label: DUE_FILTERS.find(d => d.value === filters.due)?.label, remove: () => setFilter('due', '') }] : []),
        ...selectedLabels.map(l => ({ key: `l-${l}`, label: `#${l}`, remove: () => setFilter('label', selectedLabels.filter(x => x !== l)) })),
    ]

    return (
        <div className="task-filters">
            <div className="task-filters__row">
                <div className="task-filters__search">
                    <Input
                        icon={Search}
                        type="search"
                        placeholder="Search tasks…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        aria-label="Search tasks"
                    />
                </div>

                <Menu
                    align="start"
                    panelClassName="filters-panel"
                    trigger={({ props }) => (
                        <Button icon={SlidersHorizontal} {...props} className={cx(activeCount && 'is-filtered')}>
                            <span className="hide-sm">Filters</span>
                            {activeCount > 0 && <span className="count-pill">{activeCount}</span>}
                        </Button>
                    )}
                >
                    <div className="filters-panel__body">
                        {!hideStatus && (
                            <section>
                                <h3>Status</h3>
                                <ToggleChips options={TASK_STATUSES} selected={statuses} onChange={v => setFilter('status', v)} renderIcon={v => <StatusDot status={v} />} />
                            </section>
                        )}
                        <section>
                            <h3>Priority</h3>
                            <ToggleChips options={PRIORITIES} selected={priorities} onChange={v => setFilter('priority', v)} renderIcon={v => <PriorityIcon priority={v} />} />
                        </section>
                        <div className="filters-panel__grid">
                            <section>
                                <h3>Assignee</h3>
                                <Select value={filters.assignee || ''} placeholder="Anyone" options={assigneeOptions} onChange={e => setFilter('assignee', e.target.value)} aria-label="Assignee" />
                            </section>
                            <section>
                                <h3>Due date</h3>
                                <Select value={filters.due || ''} placeholder="Any time" options={DUE_FILTERS} onChange={e => setFilter('due', e.target.value)} aria-label="Due date" />
                            </section>
                            {!scopedProject && (
                                <section>
                                    <h3>Project</h3>
                                    <Select
                                        value={filters.project || ''}
                                        placeholder="All projects"
                                        options={[{ value: 'none', label: 'No project' }, ...projects.map(p => ({ value: p._id, label: p.name }))]}
                                        onChange={e => setFilter('project', e.target.value)}
                                        aria-label="Project"
                                    />
                                </section>
                            )}
                        </div>
                        {labels.length > 0 && (
                            <section>
                                <h3>Labels</h3>
                                <ToggleChips options={labels.slice(0, 20).map(l => ({ value: l, label: l }))} selected={selectedLabels} onChange={v => setFilter('label', v)} />
                            </section>
                        )}
                    </div>
                    {activeCount > 0 && (
                        <div className="filters-panel__footer">
                            <button className="text-btn" onClick={clearFilters}>Clear all filters</button>
                        </div>
                    )}
                </Menu>

                <Menu
                    align="start"
                    trigger={({ props }) => (
                        <Button icon={ArrowUpDown} {...props} aria-label="Sort tasks">
                            <span className="hide-sm">{SORT_OPTIONS.find(o => o.value === sort)?.label}</span>
                        </Button>
                    )}
                >
                    {({ close }) => (
                        <>
                            <MenuLabel>Sort by</MenuLabel>
                            {SORT_OPTIONS.map(o => (
                                <MenuItem key={o.value} active={sort === o.value} onClick={() => { setFilters({ sort: o.value === 'createdAt' ? '' : o.value, dir: '' }); close() }}>
                                    {o.label}
                                </MenuItem>
                            ))}
                            <MenuDivider />
                            <MenuItem icon={ArrowUp} active={dir === 'asc'} onClick={() => { setFilter('dir', 'asc'); close() }}>Ascending</MenuItem>
                            <MenuItem icon={ArrowDown} active={dir === 'desc'} onClick={() => { setFilter('dir', 'desc'); close() }}>Descending</MenuItem>
                        </>
                    )}
                </Menu>

                {viewSwitcher && <div className="task-filters__view">{viewSwitcher}</div>}
            </div>

            {(chips.length > 0 || filters.q) && (
                <div className="task-filters__chips">
                    {filters.q && (
                        <span className="filter-chip">
                            “{filters.q}”
                            <button onClick={() => setSearch('')} aria-label="Clear search"><X size={12} /></button>
                        </span>
                    )}
                    {chips.map(c => (
                        <span key={c.key} className="filter-chip">
                            {c.label}
                            <button onClick={c.remove} aria-label={`Remove filter ${c.label}`}><X size={12} /></button>
                        </span>
                    ))}
                    <button className="text-btn" onClick={() => { setSearch(''); clearFilters() }}>Clear all</button>
                </div>
            )}
        </div>
    )
}
