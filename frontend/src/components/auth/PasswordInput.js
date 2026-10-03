import { useState, forwardRef } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Input } from '../ui/Form'

const PasswordInput = forwardRef(function PasswordInput(props, ref) {
    const [visible, setVisible] = useState(false)
    return (
        <div className="password-input">
            <Input ref={ref} type={visible ? 'text' : 'password'} {...props} />
            <button
                type="button"
                className="password-input__toggle"
                onClick={() => setVisible(v => !v)}
                aria-label={visible ? 'Hide password' : 'Show password'}
                aria-pressed={visible}
            >
                {visible ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
        </div>
    )
})

export default PasswordInput
