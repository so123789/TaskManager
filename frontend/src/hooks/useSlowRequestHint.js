import { useEffect, useState } from 'react'

// The hosted API sleeps when idle, so the first request can take a while.
// Returns true once `active` has been true for `delay` ms.
export default function useSlowRequestHint(active, delay = 4000) {
    const [slow, setSlow] = useState(false)
    useEffect(() => {
        if (!active) { setSlow(false); return }
        const timer = setTimeout(() => setSlow(true), delay)
        return () => clearTimeout(timer)
    }, [active, delay])
    return slow
}
