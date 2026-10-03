export default function Logo({ showName = true }) {
    return (
        <span className="logo">
            <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
                <rect width="28" height="28" rx="8" fill="var(--accent)" />
                <rect x="7" y="7.5" width="6" height="13" rx="2" fill="#fff" opacity="0.55" />
                <rect x="15" y="7.5" width="6" height="8" rx="2" fill="#fff" />
            </svg>
            {showName && <span className="logo__name">TaskManager</span>}
        </span>
    )
}
