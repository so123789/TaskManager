import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

const FILTER_KEYS = ['status', 'priority', 'assignee', 'project', 'label', 'due']
const ALL_KEYS = ['q', ...FILTER_KEYS, 'sort', 'dir']

// Task filters live in the URL so a filtered view can be bookmarked, shared
// and restored with the back button. Multi-value filters are comma separated.
export default function useTaskFilters() {
    const [params, setParams] = useSearchParams()

    const filters = useMemo(() => {
        const result = {}
        ALL_KEYS.forEach(key => {
            const value = params.get(key)
            if (value) result[key] = value
        })
        return result
    }, [params])

    // Applies several keys in one navigation; separate calls in the same tick
    // would overwrite each other because React Router reads params per render
    const setFilters = useCallback((patch) => {
        setParams(prev => {
            const next = new URLSearchParams(prev)
            Object.entries(patch).forEach(([key, value]) => {
                const serialized = Array.isArray(value) ? value.join(',') : value
                if (serialized === undefined || serialized === null || serialized === '') next.delete(key)
                else next.set(key, serialized)
            })
            return next
        }, { replace: true })
    }, [setParams])

    const setFilter = useCallback((key, value) => setFilters({ [key]: value }), [setFilters])

    const clearFilters = useCallback(() => {
        setParams(prev => {
            const next = new URLSearchParams(prev)
            ;['q', ...FILTER_KEYS].forEach(key => next.delete(key))
            return next
        }, { replace: true })
    }, [setParams])

    const activeCount = FILTER_KEYS.filter(key => filters[key]).length

    return { filters, setFilter, setFilters, clearFilters, activeCount }
}

export const splitList = (value) => (value ? value.split(',').filter(Boolean) : [])
