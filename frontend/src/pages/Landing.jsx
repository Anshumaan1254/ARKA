import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Heart, Shield, Camera, Phone } from 'lucide-react'

function Landing() {
    const { user, profile } = useAuth()

    return (
        <div className="page">
            <div className="container">
                <section style={{
                    textAlign: 'center',
                    padding: 'var(--space-12) 0',
                    maxWidth: '800px',
                    margin: '0 auto'
                }}>
                    <div style={{ fontSize: '4rem', marginBottom: 'var(--space-4)' }}>🧠💚</div>
                    <h1 style={{
                        fontSize: 'var(--font-size-4xl)',
                        fontWeight: 700,
                        marginBottom: 'var(--space-4)',
                        background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}>
                        Welcome to ARKA
                    </h1>
                    <p style={{
                        fontSize: 'var(--font-size-xl)',
                        color: 'var(--text-secondary)',
                        marginBottom: 'var(--space-8)',
                        lineHeight: 1.7
                    }}>
                        Compassionate care for Alzheimer's patients and their families.
                        Helping loved ones recognize familiar faces and cherish precious memories.
                    </p>

                    {!user ? (
                        <Link to="/login" className="btn btn-primary btn-lg">
                            Begin Your Journey
                        </Link>
                    ) : profile?.role === 'patient' ? (
                        <Link to="/patient" className="btn btn-primary btn-lg">
                            Go to My Home
                        </Link>
                    ) : (
                        <Link to="/dashboard" className="btn btn-primary btn-lg">
                            Go to Dashboard
                        </Link>
                    )}
                </section>

                <section style={{ padding: 'var(--space-12) 0' }}>
                    <h2 style={{
                        textAlign: 'center',
                        fontSize: 'var(--font-size-2xl)',
                        marginBottom: 'var(--space-8)'
                    }}>
                        How ARKA Helps
                    </h2>

                    <div className="grid grid-3" style={{ gap: 'var(--space-6)' }}>
                        <FeatureCard
                            icon={<Camera />}
                            title="Face Recognition"
                            description="Instantly identify loved ones with a simple photo. Hear personalized audio memories about each person."
                        />
                        <FeatureCard
                            icon={<Heart />}
                            title="Voice Memories"
                            description="Record and play back precious memories attached to familiar faces. Keep connections alive."
                        />
                        <FeatureCard
                            icon={<Phone />}
                            title="SOS Safety"
                            description="One-touch emergency alerts with live location sharing. Help is always just a tap away."
                        />
                    </div>
                </section>

                <section style={{
                    padding: 'var(--space-12) 0',
                    textAlign: 'center'
                }}>
                    <div className="card card-glass" style={{
                        maxWidth: '600px',
                        margin: '0 auto',
                        background: 'linear-gradient(135deg, var(--bg-tertiary) 0%, rgba(255,255,255,0.9) 100%)'
                    }}>
                        <Shield size={48} style={{ color: 'var(--color-primary)', marginBottom: 'var(--space-4)' }} />
                        <h3 style={{ fontSize: 'var(--font-size-xl)', marginBottom: 'var(--space-3)' }}>
                            Safe & Secure
                        </h3>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            Your data is protected with enterprise-grade security.
                            All photos and recordings are encrypted and stored safely.
                        </p>
                    </div>
                </section>
            </div>
        </div>
    )
}

function FeatureCard({ icon, title, description }) {
    return (
        <div className="card animate-fade-in" style={{ textAlign: 'center' }}>
            <div style={{
                display: 'inline-flex',
                padding: 'var(--space-4)',
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-full)',
                marginBottom: 'var(--space-4)',
                color: 'var(--color-primary)'
            }}>
                {icon}
            </div>
            <h3 style={{
                fontSize: 'var(--font-size-lg)',
                marginBottom: 'var(--space-2)',
                color: 'var(--text-primary)'
            }}>
                {title}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                {description}
            </p>
        </div>
    )
}

export default Landing
