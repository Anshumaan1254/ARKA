import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Mail, Lock, User, UserCheck } from 'lucide-react'

function Login() {
    const [isLogin, setIsLogin] = useState(true)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        fullName: '',
        role: 'patient'
    })

    const { signIn, signUp } = useAuth()
    const navigate = useNavigate()

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
        setError('')
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            if (isLogin) {
                const result = await signIn({
                    email: formData.email,
                    password: formData.password
                })

                if (result.session) {
                    localStorage.setItem('token', result.session.access_token)
                    // Use metadata role for immediate redirect, profile will load in background
                    const role = result.user.user_metadata?.role || 'patient'
                    navigate(role === 'caretaker' ? '/dashboard' : '/patient')
                }
            } else {
                const result = await signUp({
                    email: formData.email,
                    password: formData.password,
                    fullName: formData.fullName,
                    role: formData.role
                })

                // If email confirmation is disabled, user is logged in immediately
                if (result.session) {
                    localStorage.setItem('token', result.session.access_token)
                    navigate(formData.role === 'caretaker' ? '/dashboard' : '/patient')
                } else {
                    setError('Account created! You can now sign in.')
                    setIsLogin(true)
                }
            }
        } catch (err) {
            console.error('Auth error:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="page flex items-center justify-center">
            <div className="card" style={{ width: '100%', maxWidth: '420px' }}>
                <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
                    <div style={{ fontSize: '3rem', marginBottom: 'var(--space-2)' }}>🧠</div>
                    <h1 style={{ fontSize: 'var(--font-size-2xl)', marginBottom: 'var(--space-1)' }}>
                        {isLogin ? 'Welcome Back' : 'Join ARKA'}
                    </h1>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        {isLogin ? 'Sign in to continue' : 'Create your account'}
                    </p>
                </div>

                {error && (
                    <div style={{
                        padding: 'var(--space-3)',
                        background: error.includes('Check your email')
                            ? 'rgba(34, 197, 94, 0.1)'
                            : 'rgba(239, 68, 68, 0.1)',
                        color: error.includes('Check your email')
                            ? 'var(--color-success)'
                            : 'var(--color-error)',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: 'var(--space-4)',
                        fontSize: 'var(--font-size-sm)'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                    {!isLogin && (
                        <div className="input-group">
                            <label className="input-label">Full Name</label>
                            <div style={{ position: 'relative' }}>
                                <User size={18} style={{
                                    position: 'absolute',
                                    left: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: 'var(--text-muted)'
                                }} />
                                <input
                                    type="text"
                                    name="fullName"
                                    value={formData.fullName}
                                    onChange={handleChange}
                                    className="input"
                                    placeholder="Enter your name"
                                    style={{ paddingLeft: '40px', width: '100%' }}
                                    required={!isLogin}
                                />
                            </div>
                        </div>
                    )}

                    <div className="input-group">
                        <label className="input-label">Email</label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={18} style={{
                                position: 'absolute',
                                left: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'var(--text-muted)'
                            }} />
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="input"
                                placeholder="you@example.com"
                                style={{ paddingLeft: '40px', width: '100%' }}
                                required
                            />
                        </div>
                    </div>

                    <div className="input-group">
                        <label className="input-label">Password</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{
                                position: 'absolute',
                                left: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'var(--text-muted)'
                            }} />
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                className="input"
                                placeholder="••••••••"
                                style={{ paddingLeft: '40px', width: '100%' }}
                                required
                                minLength={6}
                            />
                        </div>
                    </div>

                    {!isLogin && (
                        <div className="input-group">
                            <label className="input-label">I am a...</label>
                            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                                <RoleButton
                                    active={formData.role === 'patient'}
                                    onClick={() => setFormData({ ...formData, role: 'patient' })}
                                    icon={<User size={20} />}
                                    label="Patient"
                                />
                                <RoleButton
                                    active={formData.role === 'caretaker'}
                                    onClick={() => setFormData({ ...formData, role: 'caretaker' })}
                                    icon={<UserCheck size={20} />}
                                    label="Caretaker"
                                />
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading}
                        style={{ marginTop: 'var(--space-2)' }}
                    >
                        {loading ? (
                            <span className="spinner" style={{ width: '20px', height: '20px' }} />
                        ) : isLogin ? 'Sign In' : 'Create Account'}
                    </button>
                </form>

                <p style={{
                    textAlign: 'center',
                    marginTop: 'var(--space-6)',
                    color: 'var(--text-secondary)',
                    fontSize: 'var(--font-size-sm)'
                }}>
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <button
                        type="button"
                        onClick={() => {
                            setIsLogin(!isLogin)
                            setError('')
                        }}
                        style={{
                            color: 'var(--color-primary)',
                            background: 'none',
                            fontWeight: 500
                        }}
                    >
                        {isLogin ? 'Sign up' : 'Sign in'}
                    </button>
                </p>
            </div>
        </div>
    )
}

function RoleButton({ active, onClick, icon, label }) {
    return (
        <button
            type="button"
            onClick={onClick}
            style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 'var(--space-2)',
                padding: 'var(--space-4)',
                background: active ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
                border: `2px solid ${active ? 'var(--color-primary)' : 'var(--border-light)'}`,
                borderRadius: 'var(--radius-md)',
                color: active ? 'var(--color-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)'
            }}
        >
            {icon}
            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>{label}</span>
        </button>
    )
}

export default Login
