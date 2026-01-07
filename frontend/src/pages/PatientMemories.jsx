import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Heart, Plus, Calendar, Clock, X, Loader, Sparkles, Smile } from 'lucide-react'

const EVENT_TYPES = [
    { value: 'memory', label: 'Memory', icon: '💭', color: '#8b5cf6' },
    { value: 'gratitude', label: 'Gratitude', icon: '🙏', color: '#10b981' },
    { value: 'milestone', label: 'Milestone', icon: '🎉', color: '#f59e0b' },
    { value: 'family', label: 'Family', icon: '👨‍👩‍👧', color: '#ec4899' }
]

const MOODS = [
    { value: 'happy', emoji: '😊', label: 'Happy' },
    { value: 'peaceful', emoji: '😌', label: 'Peaceful' },
    { value: 'grateful', emoji: '🥹', label: 'Grateful' },
    { value: 'nostalgic', emoji: '🥺', label: 'Nostalgic' }
]

const styles = {
    page: {
        minHeight: '100vh',
        background: 'linear-gradient(145deg, #fdf4ff 0%, #fae8ff 50%, #f5d0fe 100%)',
        paddingTop: '2rem',
        paddingBottom: '4rem'
    },
    container: {
        maxWidth: '700px',
        margin: '0 auto',
        padding: '0 1.5rem'
    },
    header: {
        textAlign: 'center',
        marginBottom: '2rem'
    },
    headerIcon: {
        width: '90px',
        height: '90px',
        background: 'linear-gradient(135deg, #c026d3, #a855f7)',
        borderRadius: '28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 1.5rem',
        boxShadow: '0 12px 40px rgba(168, 85, 247, 0.35)'
    },
    title: {
        fontSize: '2.25rem',
        fontWeight: '800',
        background: 'linear-gradient(135deg, #701a75, #c026d3)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        marginBottom: '0.5rem'
    },
    subtitle: {
        color: '#6b7280',
        fontSize: '1.1rem',
        maxWidth: '400px',
        margin: '0 auto 1.5rem'
    },
    addButton: {
        background: 'linear-gradient(135deg, #c026d3, #a855f7)',
        border: 'none',
        color: 'white',
        padding: '1rem 2.5rem',
        borderRadius: '20px',
        fontSize: '1.1rem',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        boxShadow: '0 6px 25px rgba(168, 85, 247, 0.4)'
    },
    card: {
        background: 'white',
        borderRadius: '24px',
        padding: '1.5rem',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
        marginBottom: '1.25rem'
    },
    memoryCard: (color) => ({
        background: 'white',
        borderRadius: '20px',
        padding: '1.25rem',
        marginBottom: '1rem',
        borderLeft: `5px solid ${color}`,
        boxShadow: '0 2px 15px rgba(0, 0, 0, 0.05)'
    }),
    memoryIcon: {
        fontSize: '2rem',
        width: '50px',
        height: '50px',
        background: '#f3e8ff',
        borderRadius: '14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    modal: {
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem'
    },
    modalContent: {
        background: 'white',
        borderRadius: '28px',
        padding: '2rem',
        maxWidth: '450px',
        width: '100%',
        maxHeight: '85vh',
        overflow: 'auto'
    },
    formGroup: {
        marginBottom: '1.25rem'
    },
    label: {
        display: 'block',
        fontWeight: '600',
        color: '#374151',
        marginBottom: '0.5rem',
        fontSize: '0.95rem'
    },
    input: {
        width: '100%',
        padding: '0.9rem 1rem',
        border: '2px solid #e5e7eb',
        borderRadius: '14px',
        fontSize: '1rem',
        background: '#f9fafb'
    },
    typeGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '0.5rem'
    },
    typeBtn: (active, color) => ({
        background: active ? color : '#f3f4f6',
        color: active ? 'white' : '#4b5563',
        border: 'none',
        padding: '0.75rem',
        borderRadius: '12px',
        cursor: 'pointer',
        fontWeight: '600',
        fontSize: '0.85rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.35rem'
    }),
    moodGrid: {
        display: 'flex',
        gap: '0.5rem'
    },
    moodBtn: (active) => ({
        flex: 1,
        background: active ? '#c026d3' : '#f3f4f6',
        border: 'none',
        padding: '0.75rem',
        borderRadius: '14px',
        fontSize: '1.5rem',
        cursor: 'pointer',
        transform: active ? 'scale(1.1)' : 'scale(1)'
    }),
    submitBtn: {
        width: '100%',
        background: 'linear-gradient(135deg, #c026d3, #a855f7)',
        border: 'none',
        color: 'white',
        padding: '1rem',
        borderRadius: '14px',
        fontSize: '1rem',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        marginTop: '0.5rem'
    },
    emptyState: {
        textAlign: 'center',
        padding: '3rem 1.5rem'
    }
}

function PatientMemories() {
    const { token, profile } = useAuth()
    const [memories, setMemories] = useState([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    const [form, setForm] = useState({
        event_type: 'memory',
        title: '',
        description: '',
        emotional_tone: 'happy'
    })

    useEffect(() => {
        fetchMemories()
    }, [token, profile])

    const fetchMemories = async () => {
        if (!token || !profile) return
        try {
            const res = await fetch(`/api/ml/memory-events/${profile.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await res.json()
            setMemories(data.events || [])
        } catch (e) {
            console.error('Failed to fetch memories:', e)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!form.title.trim()) return

        setSubmitting(true)
        try {
            const res = await fetch('/api/ml/add-memory-event', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    patient_id: profile.id,
                    event_type: form.event_type,
                    event_date: new Date().toISOString().split('T')[0],
                    title: form.title,
                    description: form.description,
                    emotional_tone: form.emotional_tone,
                    created_by: profile.id
                })
            })

            const data = await res.json()
            if (data.success) {
                setShowForm(false)
                setForm({ event_type: 'memory', title: '', description: '', emotional_tone: 'happy' })
                fetchMemories()
            }
        } catch (e) {
            console.error('Failed to save:', e)
        } finally {
            setSubmitting(false)
        }
    }

    const getType = (t) => EVENT_TYPES.find(x => x.value === t) || EVENT_TYPES[0]
    const getMood = (m) => MOODS.find(x => x.value === m) || MOODS[0]

    const formatDate = (d) => {
        const date = new Date(d)
        const diff = Math.floor((new Date() - date) / (1000 * 60 * 60 * 24))
        if (diff === 0) return 'Today'
        if (diff === 1) return 'Yesterday'
        if (diff < 7) return `${diff} days ago`
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }

    if (loading) {
        return (
            <div style={{ ...styles.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader size={48} color="#c026d3" className="spin" />
            </div>
        )
    }

    return (
        <div style={styles.page}>
            <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

            <div style={styles.container}>
                <div style={styles.header}>
                    <div style={styles.headerIcon}>
                        <Heart size={42} color="white" fill="white" />
                    </div>
                    <h1 style={styles.title}>My Memories</h1>
                    <p style={styles.subtitle}>
                        Capture beautiful moments and feelings to remember
                    </p>
                    <button style={styles.addButton} onClick={() => setShowForm(true)}>
                        <Plus size={22} />
                        Add Memory
                    </button>
                </div>

                {/* Modal */}
                {showForm && (
                    <div style={styles.modal} onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
                        <div style={styles.modalContent}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                                <h2 style={{ margin: 0, color: '#1f2937' }}>✨ New Memory</h2>
                                <button onClick={() => setShowForm(false)} style={{ background: '#f3f4f6', border: 'none', borderRadius: '10px', padding: '0.5rem', cursor: 'pointer' }}>
                                    <X size={20} color="#6b7280" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Type of Memory</label>
                                    <div style={styles.typeGrid}>
                                        {EVENT_TYPES.map(t => (
                                            <button
                                                key={t.value}
                                                type="button"
                                                style={styles.typeBtn(form.event_type === t.value, t.color)}
                                                onClick={() => setForm({ ...form, event_type: t.value })}
                                            >
                                                {t.icon} {t.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div style={styles.formGroup}>
                                    <label style={styles.label}>What do you want to remember?</label>
                                    <input
                                        style={styles.input}
                                        placeholder="e.g., Had breakfast with my son"
                                        value={form.title}
                                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                                        required
                                    />
                                </div>

                                <div style={styles.formGroup}>
                                    <label style={styles.label}>More details (optional)</label>
                                    <textarea
                                        style={{ ...styles.input, minHeight: '80px', resize: 'vertical' }}
                                        placeholder="Add any details you want to remember..."
                                        value={form.description}
                                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    />
                                </div>

                                <div style={styles.formGroup}>
                                    <label style={styles.label}>How do you feel?</label>
                                    <div style={styles.moodGrid}>
                                        {MOODS.map(m => (
                                            <button
                                                key={m.value}
                                                type="button"
                                                style={styles.moodBtn(form.emotional_tone === m.value)}
                                                onClick={() => setForm({ ...form, emotional_tone: m.value })}
                                                title={m.label}
                                            >
                                                {m.emoji}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <button type="submit" style={styles.submitBtn} disabled={submitting}>
                                    {submitting ? <Loader size={20} className="spin" /> : <Sparkles size={20} />}
                                    {submitting ? 'Saving...' : 'Save Memory'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* Memories List */}
                {memories.length === 0 ? (
                    <div style={{ ...styles.card, ...styles.emptyState }}>
                        <div style={{ width: '80px', height: '80px', background: '#fae8ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                            <Smile size={40} color="#c026d3" />
                        </div>
                        <h3 style={{ color: '#4b5563', marginBottom: '0.5rem' }}>No memories yet</h3>
                        <p style={{ color: '#9ca3af' }}>Start capturing beautiful moments!</p>
                    </div>
                ) : (
                    memories.map((mem, i) => {
                        const type = getType(mem.event_type)
                        const mood = getMood(mem.emotional_tone)
                        return (
                            <div key={mem.id || i} style={styles.memoryCard(type.color)}>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <div style={styles.memoryIcon}>{type.icon}</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <h4 style={{ margin: 0, color: '#1f2937' }}>{mem.title}</h4>
                                            <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                                                <Clock size={12} style={{ marginRight: '0.25rem' }} />
                                                {formatDate(mem.event_date)}
                                            </span>
                                        </div>
                                        {mem.description && (
                                            <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: '0.35rem 0' }}>{mem.description}</p>
                                        )}
                                        <span style={{ fontSize: '1.2rem' }}>{mood.emoji}</span>
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}

export default PatientMemories
