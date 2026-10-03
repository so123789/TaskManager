export default function Spinner({ size = 16, label }) {
    return (
        <span className="spinner" style={{ width: size, height: size }} role={label ? 'status' : undefined}>
            {label && <span className="sr-only">{label}</span>}
        </span>
    )
}

export function PageLoader() {
    return (
        <div className="page-loader">
            <Spinner size={22} label="Loading" />
        </div>
    )
}
