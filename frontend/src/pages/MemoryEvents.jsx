import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Calendar, Plus, Heart, Smile, Users, X, Loader, Sparkles, Clock } from 'lucide-react'

const EVENT_TYPES = [
    { value: 'visit', label: 'Visit', icon: '👥', color: '#10b981' },
    { value: 'call', label: 'Phone Call', icon: '📞', color: '#3b82f6' },
    { value: 'activity', label: 'Activity', icon: '🎯', color: '#f59e0b' },
    { value: 'milestone', label: 'Milestone', icon: '🎉', color: '#ec4899' },
    { value: 'medical', label: 'Medical', icon: '💊', color: '#ef4444' },
    { value: 'other', label: 'Other', icon: '📝', color: '#8b5cf6' }
]

const EMOTIONAL_TONES = [
    { value: 'happy', label: 'Happy', emoji: '😊', color: '#10b981' },
    { value: 'peaceful', label: 'Peaceful', emoji: '😌', color: '#3b82f6' },
    { value: 'exciting', label: 'Exciting', emoji: '🎉', color: '#f59e0b' },
    { value: 'neutral', label: 'Neutral', emoji: '😐', color: '#6b7280' },
    { value: 'sad', label: 'Sad', emoji: '😢', color: '#8b5cf6' }
]

const styles = {
    pageWrapper: {
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #f0fdfa 100%)',
        paddingTop: '2rem',
        paddingBottom: '4rem'
    },
    container: {
        maxWidth: '900px',
        margin: '0 auto',
        padding: '0 1.5rem'
    },
    header: {
        textAlign: 'center',
        marginBottom: '2.5rem'
    },
    headerIcon: {
        width: '80px',
        height: '80px',
        background: 'linear-gradient(135deg, #10b981, #059669)',
        borderRadius: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 1.5rem',
        boxShadow: '0 10px 40px rgba(16, 185, 129, 0.3)',
        animation: 'pulse 2s ease-in-out infinite'
    },
    title: {
        fontSize: '2.5rem',
        fontWeight: '800',
        background: 'linear-gradient(135deg, #064e3b, #10b981)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        marginBottom: '0.75rem'
    },
    subtitle: {
        fontSize: '1.1rem',
        color: '#64748b',
        maxWidth: '500px',
        margin: '0 auto 1.5rem'
    },
    addButton: {
        background: 'linear-gradient(135deg, #10b981, #059669)',
        border: 'none',
        color: 'white',
        padding: '1rem 2rem',
        borderRadius: '16px',
        fontSize: '1rem',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)',
        transition: 'all 0.3s ease',
        transform: 'translateY(0)'
    },
    timelineCard: {
        background: 'white',
        borderRadius: '24px',
        padding: '2rem',
        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.08)',
        marginBottom: '2rem'
    },
    timelineHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        marginBottom: '1.5rem',
        paddingBottom: '1rem',
        borderBottom: '2px solid #f1f5f9'
    },
    timelineTitle: {
        fontSize: '1.25rem',
        fontWeight: '700',
        color: '#1e293b',
        margin: 0
    },
    emptyState: {
        textAlign: 'center',
        padding: '4rem 2rem',
        color: '#94a3b8'
    },
    emptyIcon: {
        width: '100px',
        height: '100px',
        background: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 1.5rem'
    },
    infoCard: {
        background: 'linear-gradient(135deg, #ecfdf5, #f0fdfa)',
        borderRadius: '20px',
        padding: '1.5rem',
        border: '1px solid #d1fae5'
    },
    infoTitle: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        fontSize: '1rem',
        fontWeight: '700',
        color: '#064e3b',
        marginBottom: '0.75rem'
    },
    quote: {
        background: 'white',
        padding: '1.25rem',
        borderRadius: '16px',
        fontStyle: 'italic',
        color: '#374151',
        borderLeft: '4px solid #10b981',
        marginTop: '1rem',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)'
    },
    // Modal Styles
    modalOverlay: {
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
        animation: 'fadeIn 0.2s ease'
    },
    modal: {
        background: 'white',
        borderRadius: '28px',
        padding: '2rem',
        maxWidth: '520px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 25px 80px rgba(0, 0, 0, 0.25)',
        animation: 'slideUp 0.3s ease'
    },
    modalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        paddingBottom: '1rem',
        borderBottom: '2px solid #f1f5f9'
    },
    modalTitle: {
        fontSize: '1.5rem',
        fontWeight: '700',
        color: '#1e293b',
        margin: 0,
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
    },
    closeButton: {
        background: '#f1f5f9',
        border: 'none',
        borderRadius: '12px',
        padding: '0.6rem',
        cursor: 'pointer',
        color: '#64748b',
        transition: 'all 0.2s ease'
    },
    formGroup: {
        marginBottom: '1.5rem'
    },
    label: {
        display: 'block',
        fontSize: '0.875rem',
        fontWeight: '600',
        color: '#374151',
        marginBottom: '0.6rem'
    },
    typeGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '0.6rem'
    },
    typeButton: (isActive, color) => ({
        background: isActive ? color : '#f8fafc',
        border: `2px solid ${isActive ? color : '#e2e8f0'}`,
        color: isActive ? 'white' : '#475569',
        padding: '0.75rem 0.5rem',
        borderRadius: '12px',
        fontSize: '0.8rem',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.35rem'
    }),
    input: {
        width: '100%',
        padding: '0.875rem 1rem',
        border: '2px solid #e2e8f0',
        borderRadius: '12px',
        fontSize: '1rem',
        outline: 'none',
        transition: 'all 0.2s ease',
        background: '#f8fafc'
    },
    textarea: {
        width: '100%',
        padding: '0.875rem 1rem',
        border: '2px solid #e2e8f0',
        borderRadius: '12px',
        fontSize: '1rem',
        outline: 'none',
        transition: 'all 0.2s ease',
        resize: 'vertical',
        minHeight: '80px',
        background: '#f8fafc'
    },
    moodGrid: {
        display: 'flex',
        gap: '0.5rem'
    },
    moodButton: (isActive, color) => ({
        flex: 1,
        background: isActive ? color : '#f8fafc',
        border: `2px solid ${isActive ? color : '#e2e8f0'}`,
        padding: '0.75rem',
        borderRadius: '14px',
        fontSize: '1.75rem',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        transform: isActive ? 'scale(1.1)' : 'scale(1)'
    }),
    submitButton: {
        width: '100%',
        background: 'linear-gradient(135deg, #10b981, #059669)',
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
        boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
        transition: 'all 0.3s ease',
        marginTop: '0.5rem'
    },
    eventCard: (color) => ({
        display: 'flex',
        gap: '1rem',
        padding: '1.25rem',
        background: 'linear-gradient(135deg, #f8fafc, #ffffff)',
        borderRadius: '16px',
        borderLeft: `4px solid ${color}`,
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)',
        transition: 'all 0.3s ease',
        marginBottom: '0.75rem'
    }),
    eventIcon: {
        fontSize: '2rem',
        width: '50px',
        height: '50px',
        background: '#f1f5f9',
        borderRadius: '14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    eventContent: {
        flex: 1
    },
    eventHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '0.35rem'
    },
    eventTitle: {
        fontSize: '1rem',
        fontWeight: '600',
        color: '#1e293b',
        margin: 0
    },
    eventDate: {
        fontSize: '0.8rem',
        color: '#94a3b8',
        display: 'flex',
        alignItems: 'center',
        gap: '0.25rem'
    },
    eventDescription: {
        fontSize: '0.875rem',
        color: '#64748b',
        margin: '0.35rem 0'
    },
    badges: {
        display: 'flex',
        gap: '0.5rem',
        marginTop: '0.5rem'
    },
    badge: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        padding: '0.35rem 0.75rem',
        background: '#f1f5f9',
        borderRadius: '20px',
        fontSize: '0.75rem',
        fontWeight: '500',
        color: '#475569'
    },
    moodBadge: {
        fontSize: '1rem',
        padding: '0.25rem 0.5rem'
    }
}

function MemoryEvents() {
    const { token, profile } = useAuth()
    const [events, setEvents] = useState([])
    const [people, setPeople] = useState([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [patientId, setPatientId] = useState(null)
    const [error, setError] = useState(null)
    const [success, setSuccess] = useState(null)

    const [formData, setFormData] = useState({
        event_type: 'visit',
        event_date: new Date().toISOString().split('T')[0],
        title: '',
        description: '',
        emotional_tone: 'happy',
        person_id: ''
    })

    useEffect(() => {
        fetchData()
    }, [token, profile])

    const fetchData = async () => {
        if (!token || !profile) return

        try {
            // For caretakers, get assigned patients. For patients, use their own ID.
            let pid = null

            if (profile.role === 'caretaker') {
                // Try to get assigned patients from the people API
                try {
                    const patientsRes = await fetch('/api/patients', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    })
                    if (patientsRes.ok) {
                        const patientsData = await patientsRes.json()
                        if (patientsData.patients?.length > 0) {
                            pid = patientsData.patients[0].id
                        }
                    }
                } catch (e) {
                    console.log('Patients endpoint not available, using profile id')
                }

                // Fallback: use profile id (caretaker's own id as reference)
                if (!pid) {
                    pid = profile.id
                }
            } else {
                // Patient uses their own ID
                pid = profile.id
            }

            setPatientId(pid)

            // Try to fetch events and people
            try {
                const [eventsRes, peopleRes] = await Promise.all([
                    fetch(`/api/ml/memory-events/${pid}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    }),
                    fetch('/api/people', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    })
                ])

                const eventsData = await eventsRes.json()
                const peopleData = await peopleRes.json()

                setEvents(eventsData.events || [])
                setPeople(peopleData.people || [])
            } catch (e) {
                console.log('Could not fetch events/people:', e)
            }
        } catch (err) {
            console.error('Failed to fetch data:', err)
            setError('Failed to load data')
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError(null)
        setSuccess(null)

        if (!formData.title.trim()) {
            setError('Please enter what happened')
            return
        }

        // Use profile.id if patientId is not set
        const targetPatientId = patientId || profile?.id
        if (!targetPatientId) {
            setError('No patient ID available')
            return
        }

        setSubmitting(true)
        try {
            const response = await fetch('/api/ml/add-memory-event', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    patient_id: targetPatientId,
                    event_type: formData.event_type,
                    event_date: formData.event_date,
                    title: formData.title,
                    description: formData.description || '',
                    emotional_tone: formData.emotional_tone,
                    created_by: profile?.id || '',
                    person_id: formData.person_id || null
                })
            })

            const data = await response.json()
            console.log('Add memory response:', data)

            if (data.success) {
                setSuccess('Memory saved successfully!')
                fetchData()
                setShowForm(false)
                setFormData({
                    event_type: 'visit',
                    event_date: new Date().toISOString().split('T')[0],
                    title: '',
                    description: '',
                    emotional_tone: 'happy',
                    person_id: ''
                })
            }
        } catch (err) {
            console.error('Failed to add event:', err)
        } finally {
            setSubmitting(false)
        }
    }

    const getEventType = (type) => EVENT_TYPES.find(e => e.value === type) || EVENT_TYPES[5]
    const getEmotionalTone = (tone) => EMOTIONAL_TONES.find(e => e.value === tone) || EMOTIONAL_TONES[3]

    const formatDate = (dateStr) => {
        const date = new Date(dateStr)
        const today = new Date()
        const diffDays = Math.floor((today - date) / (1000 * 60 * 60 * 24))

        if (diffDays === 0) return 'Today'
        if (diffDays === 1) return 'Yesterday'
        if (diffDays < 7) return `${diffDays} days ago`

        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }

    if (loading) {
        return (
            <div style={{ ...styles.pageWrapper, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <div style={styles.headerIcon}>
                    <Loader size={36} color="white" className="spin" />
                </div>
            </div>
        )
    }

    return (
        <div style={styles.pageWrapper}>
            <style>{`
                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .hover-lift:hover { transform: translateY(-3px); box-shadow: 0 8px 30px rgba(16, 185, 129, 0.5) !important; }
                .event-card:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08) !important; }
            `}</style>

            <div style={styles.container}>
                {/* Header */}
                <div style={styles.header}>
                    <div style={styles.headerIcon}>
                        <Heart size={36} color="white" fill="white" />
                    </div>
                    <h1 style={styles.title}>Living Memory Graph</h1>
                    <p style={styles.subtitle}>
                        Create beautiful, personalized memories that help your loved one recognize familiar faces
                    </p>
                    <button
                        style={styles.addButton}
                        className="hover-lift"
                        onClick={() => setShowForm(true)}
                    >
                        <Plus size={20} />
                        Add Memory Event
                    </button>
                </div>

                {/* Modal */}
                {showForm && (
                    <div style={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
                        <div style={styles.modal}>
                            <div style={styles.modalHeader}>
                                <h2 style={styles.modalTitle}>
                                    <Sparkles size={24} color="#10b981" />
                                    Add Memory Event
                                </h2>
                                <button style={styles.closeButton} onClick={() => setShowForm(false)}>
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Event Type</label>
                                    <div style={styles.typeGrid}>
                                        {EVENT_TYPES.map(type => (
                                            <button
                                                key={type.value}
                                                type="button"
                                                style={styles.typeButton(formData.event_type === type.value, type.color)}
                                                onClick={() => setFormData({ ...formData, event_type: type.value })}
                                            >
                                                <span>{type.icon}</span>
                                                {type.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Date</label>
                                    <input
                                        type="date"
                                        style={styles.input}
                                        value={formData.event_date}
                                        onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                                        max={new Date().toISOString().split('T')[0]}
                                    />
                                </div>

                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Related Person (Optional)</label>
                                    <select
                                        style={styles.input}
                                        value={formData.person_id}
                                        onChange={(e) => setFormData({ ...formData, person_id: e.target.value })}
                                    >
                                        <option value="">— General Event —</option>
                                        {people.map(person => (
                                            <option key={person.id} value={person.id}>
                                                {person.name} ({person.relationship})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div style={styles.formGroup}>
                                    <label style={styles.label}>What happened?</label>
                                    <input
                                        type="text"
                                        style={styles.input}
                                        placeholder="e.g., John visited and we had ice cream together"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        required
                                    />
                                </div>

                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Details (Optional)</label>
                                    <textarea
                                        style={styles.textarea}
                                        placeholder="Add more details about this special memory..."
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>

                                <div style={styles.formGroup}>
                                    <label style={styles.label}>How was the mood?</label>
                                    <div style={styles.moodGrid}>
                                        {EMOTIONAL_TONES.map(tone => (
                                            <button
                                                key={tone.value}
                                                type="button"
                                                style={styles.moodButton(formData.emotional_tone === tone.value, tone.color)}
                                                onClick={() => setFormData({ ...formData, emotional_tone: tone.value })}
                                                title={tone.label}
                                            >
                                                {tone.emoji}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <button type="submit" style={styles.submitButton} disabled={submitting}>
                                    {submitting ? <Loader size={20} className="spin" /> : <Plus size={20} />}
                                    {submitting ? 'Saving Memory...' : 'Save Memory'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* Timeline Card */}
                <div style={styles.timelineCard}>
                    <div style={styles.timelineHeader}>
                        <Calendar size={24} color="#10b981" />
                        <h3 style={styles.timelineTitle}>Memory Timeline</h3>
                        <span style={{ marginLeft: 'auto', background: '#ecfdf5', padding: '0.35rem 0.75rem', borderRadius: '20px', fontSize: '0.875rem', fontWeight: '600', color: '#059669' }}>
                            {events.length} {events.length === 1 ? 'memory' : 'memories'}
                        </span>
                    </div>

                    {events.length === 0 ? (
                        <div style={styles.emptyState}>
                            <div style={styles.emptyIcon}>
                                <Smile size={48} color="#cbd5e1" />
                            </div>
                            <h4 style={{ color: '#475569', marginBottom: '0.5rem' }}>No memories yet</h4>
                            <p style={{ maxWidth: '300px', margin: '0 auto' }}>
                                Start adding life events to create personalized greetings during face recognition
                            </p>
                        </div>
                    ) : (
                        <div>
                            {events.map((event, index) => {
                                const eventType = getEventType(event.event_type)
                                const emotionalTone = getEmotionalTone(event.emotional_tone)
                                const person = people.find(p => p.id === event.person_id)

                                return (
                                    <div
                                        key={event.id || index}
                                        style={styles.eventCard(eventType.color)}
                                        className="event-card"
                                    >
                                        <div style={styles.eventIcon}>
                                            {eventType.icon}
                                        </div>
                                        <div style={styles.eventContent}>
                                            <div style={styles.eventHeader}>
                                                <h4 style={styles.eventTitle}>{event.title}</h4>
                                                <span style={styles.eventDate}>
                                                    <Clock size={12} />
                                                    {formatDate(event.event_date)}
                                                </span>
                                            </div>
                                            {event.description && (
                                                <p style={styles.eventDescription}>{event.description}</p>
                                            )}
                                            <div style={styles.badges}>
                                                {person && (
                                                    <span style={styles.badge}>
                                                        <Users size={12} /> {person.name}
                                                    </span>
                                                )}
                                                <span style={{ ...styles.badge, ...styles.moodBadge }}>
                                                    {emotionalTone.emoji}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Info Card */}
                <div style={styles.infoCard}>
                    <h4 style={styles.infoTitle}>
                        <Sparkles size={18} color="#10b981" />
                        Powered by Gemini AI
                    </h4>
                    <p style={{ fontSize: '0.9rem', color: '#475569', margin: 0 }}>
                        When your patient recognizes someone, ARKA creates personalized, emotional greetings:
                    </p>
                    <div style={styles.quote}>
                        "This is your son, John. He visited you last Sunday and you both had vanilla ice cream together. He loves you very much."
                    </div>
                </div>
            </div>
        </div>
    )
}

export default MemoryEvents
