import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Bell, Plus, Clock, X, Loader, Check, Trash2, Calendar, Volume2, VolumeX } from 'lucide-react'

const REMINDER_TYPES = [
    { value: 'medication', label: 'Medication', icon: '💊', color: '#ef4444', voice: 'Time to take your medication' },
    { value: 'meal', label: 'Meal', icon: '🍽️', color: '#f59e0b', voice: 'It is time for your meal' },
    { value: 'exercise', label: 'Exercise', icon: '🚶', color: '#10b981', voice: 'Time for some exercise' },
    { value: 'appointment', label: 'Appointment', icon: '📅', color: '#3b82f6', voice: 'You have an appointment' },
    { value: 'call', label: 'Call Someone', icon: '📞', color: '#8b5cf6', voice: 'Time to call someone' },
    { value: 'other', label: 'Other', icon: '📝', color: '#6b7280', voice: 'You have a reminder' }
]

const TIME_OPTIONS = [
    '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
    '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'
]

const styles = {
    page: {
        minHeight: '100vh',
        background: 'linear-gradient(145deg, #fef3c7 0%, #fde68a 50%, #fcd34d 100%)',
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
        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
        borderRadius: '28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 1.5rem',
        boxShadow: '0 12px 40px rgba(245, 158, 11, 0.35)'
    },
    title: {
        fontSize: '2.25rem',
        fontWeight: '800',
        background: 'linear-gradient(135deg, #78350f, #f59e0b)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        marginBottom: '0.5rem'
    },
    subtitle: {
        color: '#6b7280',
        fontSize: '1.1rem',
        maxWidth: '400px',
        margin: '0 auto 1rem'
    },
    voiceToggle: (enabled) => ({
        background: enabled ? 'linear-gradient(135deg, #22c55e, #16a34a)' : '#e5e7eb',
        border: 'none',
        color: enabled ? 'white' : '#6b7280',
        padding: '0.6rem 1.25rem',
        borderRadius: '12px',
        fontSize: '0.9rem',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginBottom: '1rem'
    }),
    addButton: {
        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
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
        boxShadow: '0 6px 25px rgba(245, 158, 11, 0.4)'
    },
    currentTime: {
        background: 'white',
        borderRadius: '20px',
        padding: '1rem 2rem',
        display: 'inline-block',
        marginBottom: '1.5rem',
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.08)'
    },
    timeDisplay: {
        fontSize: '2.5rem',
        fontWeight: '800',
        color: '#f59e0b'
    },
    card: {
        background: 'white',
        borderRadius: '24px',
        padding: '1.5rem',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
        marginBottom: '1.25rem'
    },
    reminderCard: (color, active) => ({
        background: active ? 'white' : '#f9fafb',
        borderRadius: '18px',
        padding: '1.25rem',
        marginBottom: '0.75rem',
        borderLeft: `5px solid ${active ? color : '#d1d5db'}`,
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)',
        opacity: active ? 1 : 0.6,
        display: 'flex',
        alignItems: 'center',
        gap: '1rem'
    }),
    reminderIcon: {
        fontSize: '2rem',
        width: '55px',
        height: '55px',
        background: '#fef3c7',
        borderRadius: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    timeLabel: {
        background: '#fef3c7',
        color: '#92400e',
        padding: '0.4rem 0.75rem',
        borderRadius: '10px',
        fontSize: '0.9rem',
        fontWeight: '700',
        display: 'flex',
        alignItems: 'center',
        gap: '0.25rem'
    },
    actionBtn: (bg, color) => ({
        background: bg,
        border: 'none',
        borderRadius: '10px',
        padding: '0.5rem',
        cursor: 'pointer',
        color: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    }),
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
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '0.5rem'
    },
    typeBtn: (active, color) => ({
        background: active ? color : '#f3f4f6',
        color: active ? 'white' : '#4b5563',
        border: 'none',
        padding: '0.65rem 0.5rem',
        borderRadius: '12px',
        cursor: 'pointer',
        fontWeight: '600',
        fontSize: '0.75rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.25rem'
    }),
    timeGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '0.5rem'
    },
    timeBtn: (active) => ({
        background: active ? '#f59e0b' : '#f3f4f6',
        color: active ? 'white' : '#4b5563',
        border: 'none',
        padding: '0.6rem',
        borderRadius: '10px',
        cursor: 'pointer',
        fontWeight: '600',
        fontSize: '0.85rem'
    }),
    submitBtn: {
        width: '100%',
        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
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
    },
    alertOverlay: {
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000
    },
    alertCard: {
        background: 'white',
        borderRadius: '32px',
        padding: '3rem',
        maxWidth: '400px',
        width: '90%',
        textAlign: 'center',
        animation: 'pulse 1s ease-in-out infinite'
    }
}

function PatientReminders() {
    const { token, profile } = useAuth()
    const [reminders, setReminders] = useState([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [voiceEnabled, setVoiceEnabled] = useState(true)
    const [currentTime, setCurrentTime] = useState(new Date())
    const [activeAlert, setActiveAlert] = useState(null)
    const audioRef = useRef(null)
    const checkedTimesRef = useRef(new Set())

    const [form, setForm] = useState({
        type: 'medication',
        title: '',
        time: '09:00',
        customTime: '',
        repeat: 'daily' // 'daily' or 'once'
    })

    // Update current time every second
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date())
        }, 1000)
        return () => clearInterval(timer)
    }, [])

    // Load reminders from localStorage (database implementation would go here)
    useEffect(() => {
        loadReminders()
    }, [profile])

    // Clean up expired "once" reminders at midnight
    useEffect(() => {
        const now = new Date()
        if (now.getHours() === 0 && now.getMinutes() === 0) {
            const today = now.toISOString().split('T')[0]
            const filtered = reminders.filter(r => {
                if (r.repeat === 'once' && r.createdDate !== today) {
                    return false // Remove expired one-time reminders
                }
                return true
            })
            if (filtered.length !== reminders.length) {
                saveReminders(filtered)
            }
        }
    }, [currentTime])

    const loadReminders = () => {
        if (!profile?.id) return
        const saved = localStorage.getItem(`reminders_${profile.id}`)
        if (saved) {
            setReminders(JSON.parse(saved))
        }
        setLoading(false)
    }

    const saveReminders = (newReminders) => {
        setReminders(newReminders)
        if (profile?.id) {
            localStorage.setItem(`reminders_${profile.id}`, JSON.stringify(newReminders))
        }
    }

    // Speak the reminder
    const speakReminder = useCallback((reminder) => {
        if (!voiceEnabled) return

        const type = REMINDER_TYPES.find(t => t.value === reminder.type)
        const text = `${type?.voice || 'Reminder'}. ${reminder.title}`

        // Cancel any ongoing speech
        speechSynthesis.cancel()

        const utterance = new SpeechSynthesisUtterance(text)
        utterance.rate = 0.9
        utterance.pitch = 1
        utterance.volume = 1

        // Try to find a friendly voice
        const voices = speechSynthesis.getVoices()
        const preferredVoice = voices.find(v =>
            v.name.includes('Google') ||
            v.name.includes('Samantha') ||
            v.name.includes('Microsoft Zira')
        )
        if (preferredVoice) {
            utterance.voice = preferredVoice
        }

        speechSynthesis.speak(utterance)
    }, [voiceEnabled])

    // Check for due reminders
    useEffect(() => {
        const checkReminders = () => {
            const now = new Date()
            const currentMinute = now.getMinutes()
            const currentHour = now.getHours()
            const today = now.toISOString().split('T')[0]
            const timeKey = `${today}-${currentHour}:${currentMinute}`

            // Only check each minute once
            if (checkedTimesRef.current.has(timeKey)) return

            reminders.forEach(reminder => {
                if (!reminder.is_active) return

                // Check if one-time reminder is for today
                if (reminder.repeat === 'once' && reminder.createdDate !== today) {
                    return // Skip - this is an old one-time reminder
                }

                const [reminderHour, reminderMinute] = reminder.time.split(':').map(Number)

                if (reminderHour === currentHour && reminderMinute === currentMinute) {
                    // Trigger this reminder!
                    setActiveAlert(reminder)
                    speakReminder(reminder)
                    checkedTimesRef.current.add(timeKey)

                    // Update last triggered
                    const updated = reminders.map(r =>
                        r.id === reminder.id
                            ? { ...r, lastTriggered: now.toISOString() }
                            : r
                    )
                    saveReminders(updated)
                }
            })
        }

        const interval = setInterval(checkReminders, 1000)
        return () => clearInterval(interval)
    }, [reminders, speakReminder])

    // Reset checked times at midnight
    useEffect(() => {
        const now = new Date()
        if (now.getHours() === 0 && now.getMinutes() === 0) {
            checkedTimesRef.current.clear()
        }
    }, [currentTime])

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!form.title.trim()) return

        // Use custom time if provided, otherwise use selected time
        const finalTime = form.customTime || form.time

        const newReminder = {
            id: Date.now().toString(),
            type: form.type,
            title: form.title,
            time: finalTime,
            repeat: form.repeat,
            is_active: true,
            createdAt: new Date().toISOString(),
            createdDate: new Date().toISOString().split('T')[0]
        }

        saveReminders([newReminder, ...reminders])
        setShowForm(false)
        setForm({ type: 'medication', title: '', time: '09:00', customTime: '', repeat: 'daily' })
    }

    const toggleActive = (id) => {
        const updated = reminders.map(r =>
            r.id === id ? { ...r, is_active: !r.is_active } : r
        )
        saveReminders(updated)
    }

    const deleteReminder = (id) => {
        saveReminders(reminders.filter(r => r.id !== id))
    }

    const dismissAlert = () => {
        speechSynthesis.cancel()
        setActiveAlert(null)
    }

    const getType = (t) => REMINDER_TYPES.find(x => x.value === t) || REMINDER_TYPES[5]

    const formatCurrentTime = () => {
        return currentTime.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        })
    }

    const getNextReminder = () => {
        const now = currentTime
        const currentMins = now.getHours() * 60 + now.getMinutes()

        const activeReminders = reminders.filter(r => r.is_active)
        if (activeReminders.length === 0) return null

        let next = null
        let minDiff = Infinity

        activeReminders.forEach(r => {
            const [h, m] = r.time.split(':').map(Number)
            let reminderMins = h * 60 + m

            // If reminder time has passed today, consider it for tomorrow
            if (reminderMins <= currentMins) {
                reminderMins += 24 * 60
            }

            const diff = reminderMins - currentMins
            if (diff < minDiff) {
                minDiff = diff
                next = { ...r, minsUntil: diff }
            }
        })

        return next
    }

    const nextReminder = getNextReminder()

    if (loading) {
        return (
            <div style={{ ...styles.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader size={48} color="#f59e0b" className="spin" />
            </div>
        )
    }

    return (
        <div style={styles.page}>
            <style>{`
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.02); } }
                @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
            `}</style>

            {/* Active Alert Overlay */}
            {activeAlert && (
                <div style={styles.alertOverlay} onClick={dismissAlert}>
                    <div style={styles.alertCard} onClick={e => e.stopPropagation()}>
                        <div style={{
                            width: '100px',
                            height: '100px',
                            background: getType(activeAlert.type).color,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 1.5rem',
                            fontSize: '3rem',
                            animation: 'shake 0.5s ease-in-out infinite'
                        }}>
                            {getType(activeAlert.type).icon}
                        </div>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#1e293b', marginBottom: '0.5rem' }}>
                            ⏰ Reminder!
                        </h2>
                        <p style={{ fontSize: '1.25rem', color: '#64748b', marginBottom: '1.5rem' }}>
                            {activeAlert.title}
                        </p>
                        <button
                            onClick={dismissAlert}
                            style={{
                                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                                border: 'none',
                                color: 'white',
                                padding: '1rem 3rem',
                                borderRadius: '16px',
                                fontSize: '1.1rem',
                                fontWeight: '700',
                                cursor: 'pointer'
                            }}
                        >
                            <Check size={20} style={{ marginRight: '0.5rem' }} />
                            Got it!
                        </button>
                    </div>
                </div>
            )}

            <div style={styles.container}>
                <div style={styles.header}>
                    <div style={styles.headerIcon}>
                        <Bell size={42} color="white" />
                    </div>
                    <h1 style={styles.title}>My Reminders</h1>
                    <p style={styles.subtitle}>
                        Never forget important tasks and medications
                    </p>

                    {/* Current Time */}
                    <div style={styles.currentTime}>
                        <div style={styles.timeDisplay}>{formatCurrentTime()}</div>
                    </div>

                    {/* Voice Toggle */}
                    <div>
                        <button
                            style={styles.voiceToggle(voiceEnabled)}
                            onClick={() => setVoiceEnabled(!voiceEnabled)}
                        >
                            {voiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                            Voice Alerts {voiceEnabled ? 'ON' : 'OFF'}
                        </button>
                    </div>

                    {/* Next Reminder Info */}
                    {nextReminder && (
                        <div style={{
                            background: 'rgba(255,255,255,0.8)',
                            borderRadius: '14px',
                            padding: '0.75rem 1.5rem',
                            marginBottom: '1rem',
                            display: 'inline-block'
                        }}>
                            <span style={{ color: '#64748b' }}>Next: </span>
                            <strong style={{ color: '#f59e0b' }}>
                                {getType(nextReminder.type).icon} {nextReminder.title}
                            </strong>
                            <span style={{ color: '#64748b' }}> at </span>
                            <strong style={{ color: '#1e293b' }}>{nextReminder.time}</strong>
                            <span style={{ color: '#64748b' }}> ({nextReminder.minsUntil} mins)</span>
                        </div>
                    )}

                    <div>
                        <button style={styles.addButton} onClick={() => setShowForm(true)}>
                            <Plus size={22} />
                            Add Reminder
                        </button>
                    </div>
                </div>

                {/* Modal */}
                {showForm && (
                    <div style={styles.modal} onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
                        <div style={styles.modalContent}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                                <h2 style={{ margin: 0, color: '#1f2937' }}>⏰ New Reminder</h2>
                                <button onClick={() => setShowForm(false)} style={{ background: '#f3f4f6', border: 'none', borderRadius: '10px', padding: '0.5rem', cursor: 'pointer' }}>
                                    <X size={20} color="#6b7280" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Reminder Type</label>
                                    <div style={styles.typeGrid}>
                                        {REMINDER_TYPES.map(t => (
                                            <button
                                                key={t.value}
                                                type="button"
                                                style={styles.typeBtn(form.type === t.value, t.color)}
                                                onClick={() => setForm({ ...form, type: t.value })}
                                            >
                                                <span style={{ fontSize: '1.5rem' }}>{t.icon}</span>
                                                {t.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div style={styles.formGroup}>
                                    <label style={styles.label}>What should I remind you?</label>
                                    <input
                                        style={styles.input}
                                        placeholder="e.g., Take blood pressure medicine"
                                        value={form.title}
                                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                                        required
                                    />
                                </div>

                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Time</label>
                                    <div style={styles.timeGrid}>
                                        {TIME_OPTIONS.map(t => (
                                            <button
                                                key={t}
                                                type="button"
                                                style={styles.timeBtn(form.time === t && !form.customTime)}
                                                onClick={() => setForm({ ...form, time: t, customTime: '' })}
                                            >
                                                {t}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Custom Time Input */}
                                    <div style={{ marginTop: '0.75rem' }}>
                                        <label style={{ ...styles.label, fontSize: '0.85rem', color: '#6b7280' }}>
                                            Or set custom time:
                                        </label>
                                        <input
                                            type="time"
                                            style={{
                                                ...styles.input,
                                                padding: '0.75rem 1rem',
                                                fontSize: '1.1rem',
                                                fontWeight: '600',
                                                color: form.customTime ? '#f59e0b' : '#6b7280',
                                                borderColor: form.customTime ? '#f59e0b' : '#e5e7eb'
                                            }}
                                            value={form.customTime}
                                            onChange={(e) => setForm({ ...form, customTime: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* Repeat Options */}
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Repeat</label>
                                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                                        <button
                                            type="button"
                                            onClick={() => setForm({ ...form, repeat: 'daily' })}
                                            style={{
                                                flex: 1,
                                                background: form.repeat === 'daily' ? 'linear-gradient(135deg, #22c55e, #16a34a)' : '#f3f4f6',
                                                color: form.repeat === 'daily' ? 'white' : '#4b5563',
                                                border: 'none',
                                                padding: '1rem',
                                                borderRadius: '14px',
                                                fontSize: '0.95rem',
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: '0.25rem'
                                            }}
                                        >
                                            <span style={{ fontSize: '1.5rem' }}>🔄</span>
                                            Every Day
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setForm({ ...form, repeat: 'once' })}
                                            style={{
                                                flex: 1,
                                                background: form.repeat === 'once' ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : '#f3f4f6',
                                                color: form.repeat === 'once' ? 'white' : '#4b5563',
                                                border: 'none',
                                                padding: '1rem',
                                                borderRadius: '14px',
                                                fontSize: '0.95rem',
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: '0.25rem'
                                            }}
                                        >
                                            <span style={{ fontSize: '1.5rem' }}>1️⃣</span>
                                            Today Only
                                        </button>
                                    </div>
                                </div>

                                <button type="submit" style={styles.submitBtn} disabled={submitting}>
                                    {submitting ? <Loader size={20} className="spin" /> : <Bell size={20} />}
                                    {submitting ? 'Saving...' : 'Set Reminder'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* Reminders List */}
                {reminders.length === 0 ? (
                    <div style={{ ...styles.card, ...styles.emptyState }}>
                        <div style={{ width: '80px', height: '80px', background: '#fef3c7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                            <Calendar size={40} color="#f59e0b" />
                        </div>
                        <h3 style={{ color: '#4b5563', marginBottom: '0.5rem' }}>No reminders yet</h3>
                        <p style={{ color: '#9ca3af' }}>Add reminders for medications, meals, and more!</p>
                    </div>
                ) : (
                    <div style={styles.card}>
                        <h3 style={{ color: '#92400e', marginBottom: '1rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Bell size={18} />
                            Your Reminders ({reminders.length})
                        </h3>
                        {reminders.sort((a, b) => a.time.localeCompare(b.time)).map(rem => {
                            const type = getType(rem.type)
                            return (
                                <div key={rem.id} style={styles.reminderCard(type.color, rem.is_active)}>
                                    <div style={{ ...styles.reminderIcon, background: rem.is_active ? '#fef3c7' : '#e5e7eb' }}>
                                        {type.icon}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <h4 style={{ margin: 0, color: '#1f2937', fontSize: '1rem' }}>{rem.title}</h4>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                                            <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{type.label}</span>
                                            <span style={{
                                                background: rem.repeat === 'daily' ? '#dcfce7' : '#dbeafe',
                                                color: rem.repeat === 'daily' ? '#16a34a' : '#2563eb',
                                                padding: '0.15rem 0.5rem',
                                                borderRadius: '6px',
                                                fontSize: '0.7rem',
                                                fontWeight: '600'
                                            }}>
                                                {rem.repeat === 'daily' ? '🔄 Daily' : '1️⃣ Once'}
                                            </span>
                                        </div>
                                    </div>
                                    <span style={styles.timeLabel}>
                                        <Clock size={14} /> {rem.time}
                                    </span>
                                    <button
                                        style={styles.actionBtn(rem.is_active ? '#d1fae5' : '#fef3c7', rem.is_active ? '#059669' : '#f59e0b')}
                                        onClick={() => toggleActive(rem.id)}
                                        title={rem.is_active ? "Disable" : "Enable"}
                                    >
                                        {rem.is_active ? <Check size={20} /> : <Bell size={18} />}
                                    </button>
                                    <button
                                        style={styles.actionBtn('#fee2e2', '#dc2626')}
                                        onClick={() => deleteReminder(rem.id)}
                                        title="Delete"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* Info about voice alerts */}
                <div style={{
                    background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
                    borderRadius: '20px',
                    padding: '1.25rem',
                    marginTop: '1rem'
                }}>
                    <h4 style={{ margin: '0 0 0.5rem', color: '#065f46', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Volume2 size={18} />
                        Voice Alerts
                    </h4>
                    <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#047857', fontSize: '0.9rem', lineHeight: 1.7 }}>
                        <li>Keep this page open to receive voice reminders</li>
                        <li>Reminders will speak at the exact time you set</li>
                        <li>Make sure your volume is up!</li>
                    </ul>
                </div>
            </div>
        </div>
    )
}

export default PatientReminders
