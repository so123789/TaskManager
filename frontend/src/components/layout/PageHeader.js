export default function PageHeader({ title, description, actions, children }) {
    return (
        <header className="page-header">
            <div className="page-header__text">
                {children}
                <h1 className="page-header__title">{title}</h1>
                {description && <p className="page-header__description">{description}</p>}
            </div>
            {actions && <div className="page-header__actions">{actions}</div>}
        </header>
    )
}
