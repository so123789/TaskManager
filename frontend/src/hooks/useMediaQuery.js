import { useSyncExternalStore } from 'react'

export default function useMediaQuery(query) {
    return useSyncExternalStore(
        (onChange) => {
            const list = window.matchMedia(query)
            list.addEventListener('change', onChange)
            return () => list.removeEventListener('change', onChange)
        },
        () => window.matchMedia(query).matches,
        () => false
    )
}

// Layout breakpoints shared with the CSS (see styles/layout.css)
export const useIsMobile = () => useMediaQuery('(max-width: 767px)')
export const useIsTablet = () => useMediaQuery('(min-width: 768px) and (max-width: 1099px)')
