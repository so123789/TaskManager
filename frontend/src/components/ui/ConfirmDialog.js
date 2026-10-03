import Modal from './Modal'
import Button from './Button'

export default function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', onConfirm, onCancel, loading, danger = true }) {
    return (
        <Modal
            open={open}
            onClose={onCancel}
            title={title}
            size="sm"
            footer={(
                <>
                    <Button onClick={onCancel} disabled={loading}>Cancel</Button>
                    <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading} data-autofocus>
                        {confirmLabel}
                    </Button>
                </>
            )}
        >
            <p className="confirm__message">{message}</p>
        </Modal>
    )
}
