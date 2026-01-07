import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import {
    Activity, AlertTriangle, Heart, Clock,
    Shield, CheckCircle, XCircle, Loader, Bell, Zap, Brain
} from 'lucide-react'

const SEVERITY_CONFIG = {
    critical: { color: '#ef4444', bg: '#fef2f2', label: 'Critical' },
    high: { color: '#f97316', bg: '#fff7ed', label: 'High' },
    medium: { color: '#eab308', bg: '#fefce8', label: 'Medium' },
    low: { color: '#22c55e', bg: '#f0fdf4', label: 'Low' }
}

const ALERT_CONFIG = {
    wandering: { icon: '🚶', label: 'Wandering Detected' },
    panic: { icon: '😰', label: 'Panic Alert' },
    fall: { icon: '⚠️', label: 'Fall Detected' },
    irregular_heart: { icon: '❤️', label: 'Irregular Heartbeat' },
    unusual_activity: { icon: '🔍', label: 'Unusual Activity' }
}

const styles = {
    pageWrapper: {
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #fef3c7 0%, #fef9c3 30%, #ecfdf5 100%)',
        paddingTop: '2rem',
        paddingBottom: '4rem'
    },
    container: {
        maxWidth: '1000px',
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
        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
        borderRadius: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 1.5rem',
        boxShadow: '0 10px 40px rgba(245, 158, 11, 0.3)',
        animation: 'pulse 2s ease-in-out infinite'
    },
    title: {
        fontSize: '2.5rem',
        fontWeight: '800',
        background: 'linear-gradient(135deg, #78350f, #f59e0b)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        marginBottom: '0.75rem'
    },
    subtitle: {
        fontSize: '1.1rem',
        color: '#64748b',
        maxWidth: '550px',
        margin: '0 auto'
    },
    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
    },
    statCard: (gradient, shadowColor) => ({
        background: gradient,
        borderRadius: '20px',
        padding: '1.5rem',
        boxShadow: `0 8px 30px ${shadowColor}`,
        display: 'flex',
        alignItems: 'center',
        gap: '1rem'
    }),
    statIcon: {
        width: '56px',
        height: '56px',
        background: 'rgba(255,255,255,0.3)',
        borderRadius: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    statValue: {
        fontSize: '2rem',
        fontWeight: '800',
        color: 'white',
        lineHeight: 1
    },
    statLabel: {
        fontSize: '0.875rem',
        color: 'rgba(255,255,255,0.9)',
        fontWeight: '500'
    },
    mainCard: {
        background: 'white',
        borderRadius: '24px',
        padding: '2rem',
        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.08)',
        marginBottom: '2rem'
    },
    cardHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        marginBottom: '1.5rem',
        paddingBottom: '1rem',
        borderBottom: '2px solid #f1f5f9'
    },
    cardTitle: {
        fontSize: '1.25rem',
        fontWeight: '700',
        color: '#1e293b',
        margin: 0
    },
    trainButton: {
        marginLeft: 'auto',
        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
        border: 'none',
        color: 'white',
        padding: '0.75rem 1.5rem',
        borderRadius: '12px',
        fontSize: '0.875rem',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)',
        transition: 'all 0.3s ease'
    },
    emptyState: {
        textAlign: 'center',
        padding: '4rem 2rem'
    },
    emptyIcon: {
        width: '100px',
        height: '100px',
        background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 1.5rem'
    },
    alertCard: (severity) => ({
        background: SEVERITY_CONFIG[severity]?.bg || '#f8fafc',
        borderRadius: '16px',
        padding: '1.25rem',
        borderLeft: `4px solid ${SEVERITY_CONFIG[severity]?.color || '#9ca3af'}`,
        marginBottom: '0.75rem',
        transition: 'all 0.3s ease'
    }),
    alertHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '1rem'
    },
    alertContent: {
        display: 'flex',
        gap: '1rem',
        flex: 1
    },
    alertIcon: {
        fontSize: '2rem',
        width: '50px',
        height: '50px',
        background: 'white',
        borderRadius: '14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
    },
    alertInfo: {
        flex: 1
    },
    alertTitle: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginBottom: '0.25rem'
    },
    alertName: {
        fontSize: '1rem',
        fontWeight: '600',
        color: '#1e293b',
        margin: 0,
        textTransform: 'capitalize'
    },
    severityBadge: (severity) => ({
        background: SEVERITY_CONFIG[severity]?.color || '#9ca3af',
        color: 'white',
        padding: '0.2rem 0.6rem',
        borderRadius: '6px',
        fontSize: '0.65rem',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
    }),
    alertReason: {
        fontSize: '0.875rem',
        color: '#64748b',
        margin: '0.25rem 0'
    },
    alertMeta: {
        display: 'flex',
        gap: '1rem',
        marginTop: '0.5rem',
        fontSize: '0.8rem',
        color: '#94a3b8'
    },
    metaItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.25rem'
    },
    alertActions: {
        display: 'flex',
        gap: '0.5rem'
    },
    actionButton: (color, bgColor) => ({
        background: bgColor,
        border: 'none',
        color: color,
        padding: '0.6rem',
        borderRadius: '10px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    }),
    acknowledgedBadge: {
        background: '#d1fae5',
        color: '#059669',
        padding: '0.4rem 0.8rem',
        borderRadius: '8px',
        fontSize: '0.75rem',
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        gap: '0.25rem'
    },
    infoCard: {
        background: 'linear-gradient(135deg, #fef3c7, #fef9c3)',
        borderRadius: '20px',
        padding: '1.5rem',
        border: '1px solid #fde68a'
    },
    infoTitle: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        fontSize: '1rem',
        fontWeight: '700',
        color: '#78350f',
        marginBottom: '0.75rem'
    },
    infoList: {
        fontSize: '0.875rem',
        color: '#713f12',
        margin: 0,
        paddingLeft: '1.25rem',
        lineHeight: 1.8
    }
}

function HealthMonitor() {
    const { token, profile } = useAuth()
    const [alerts, setAlerts] = useState([])
    const [sosAlerts, setSosAlerts] = useState([])
    const [loading, setLoading] = useState(true)
    const [patientId, setPatientId] = useState(null)
    const [patientInfo, setPatientInfo] = useState(null)
    const [modelStatus, setModelStatus] = useState(null)
    const [training, setTraining] = useState(false)

    useEffect(() => {
        fetchData()
        const interval = setInterval(fetchData, 30000)
        return () => clearInterval(interval)
    }, [token, profile])

    const fetchData = async () => {
        if (!token || !profile) return

        try {
            // Get patient ID - use profile.id as fallback
            let pid = profile.id

            try {
                const patientsRes = await fetch('/api/patients', {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                if (patientsRes.ok) {
                    const patientsData = await patientsRes.json()
                    if (patientsData.patients?.length > 0) {
                        const patient = patientsData.patients[0]
                        pid = patient.id
                        setPatientInfo(patient)
                    }
                }
            } catch (e) {
                console.log('Using profile id as patient id')
            }

            setPatientId(pid)

            // Fetch anomaly alerts, SOS alerts, and features in parallel
            const [alertsRes, sosRes, featuresRes] = await Promise.all([
                fetch(`/api/ml/anomaly-alerts/${pid}?limit=20`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }).catch(() => ({ ok: false })),
                fetch(`/api/sos?patient_id=${pid}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }).catch(() => ({ ok: false })),
                fetch('/api/ml/features', {
                    headers: { 'Authorization': `Bearer ${token}` }
                }).catch(() => ({ ok: false }))
            ])

            if (alertsRes.ok) {
                const alertsData = await alertsRes.json()
                setAlerts(alertsData.alerts || [])
            }

            if (sosRes.ok) {
                const sosData = await sosRes.json()
                setSosAlerts(sosData.alerts || [])
            }

            if (featuresRes.ok) {
                const features = await featuresRes.json()
                setModelStatus(features)
            }
        } catch (err) {
            console.error('Failed to fetch data:', err)
        } finally {
            setLoading(false)
        }
    }

    const acknowledgeAlert = async (alertId, falsePositive = false) => {
        try {
            const form = new FormData()
            form.append('alert_id', alertId)
            form.append('acknowledged_by', profile?.id || '')
            form.append('false_positive', falsePositive)
            form.append('action_taken', falsePositive ? 'Marked as false positive' : 'Acknowledged')

            await fetch('/api/ml/acknowledge-alert', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: form
            })

            fetchData()
        } catch (err) {
            console.error('Failed to acknowledge:', err)
        }
    }

    const resolveSosAlert = async (alertId) => {
        try {
            await fetch(`/api/sos/${alertId}/resolve`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            })
            fetchData()
        } catch (err) {
            console.error('Failed to resolve SOS:', err)
        }
    }

    const trainModel = async () => {
        if (!patientId || training) return

        setTraining(true)
        try {
            const form = new FormData()
            form.append('patient_id', patientId)

            const res = await fetch('/api/ml/train-anomaly-model', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: form
            })

            const data = await res.json()
            if (data.success) {
                fetchData()
            }
        } catch (err) {
            console.error('Training failed:', err)
        } finally {
            setTraining(false)
        }
    }

    const formatTime = (timestamp) => {
        const date = new Date(timestamp)
        const now = new Date()
        const diffMins = Math.floor((now - date) / (1000 * 60))

        if (diffMins < 1) return 'Just now'
        if (diffMins < 60) return `${diffMins}m ago`
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
        return date.toLocaleDateString()
    }

    const unresolvedSosCount = sosAlerts.filter(a => !a.resolved).length
    const unacknowledgedCount = alerts.filter(a => !a.acknowledged).length + unresolvedSosCount

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
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .hover-lift:hover { transform: translateY(-2px); }
                .alert-card:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1) !important; }
            `}</style>

            <div style={styles.container}>
                {/* Header */}
                <div style={styles.header}>
                    <div style={styles.headerIcon}>
                        <Shield size={36} color="white" />
                    </div>
                    <h1 style={styles.title}>Predictive Sentinel</h1>
                    <p style={styles.subtitle}>
                        AI-powered anomaly detection that predicts wandering and panic before they happen
                    </p>
                </div>

                {/* Stats Grid */}
                <div style={styles.statsGrid}>
                    <div style={styles.statCard(
                        unacknowledgedCount > 0
                            ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                            : 'linear-gradient(135deg, #22c55e, #16a34a)',
                        unacknowledgedCount > 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)'
                    )}>
                        <div style={styles.statIcon}>
                            <Bell size={28} color="white" />
                        </div>
                        <div>
                            <div style={styles.statValue}>{unacknowledgedCount}</div>
                            <div style={styles.statLabel}>Active Alerts</div>
                        </div>
                    </div>

                    <div style={styles.statCard(
                        'linear-gradient(135deg, #3b82f6, #2563eb)',
                        'rgba(59, 130, 246, 0.3)'
                    )}>
                        <div style={styles.statIcon}>
                            <Activity size={28} color="white" />
                        </div>
                        <div>
                            <div style={styles.statValue}>{modelStatus?.anomaly_detection ? '✓' : '—'}</div>
                            <div style={styles.statLabel}>Model Status</div>
                        </div>
                    </div>

                    <div style={styles.statCard(
                        'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                        'rgba(139, 92, 246, 0.3)'
                    )}>
                        <div style={styles.statIcon}>
                            <Heart size={28} color="white" />
                        </div>
                        <div>
                            <div style={styles.statValue}>{patientInfo?.full_name?.split(' ')[0] || 'Patient'}</div>
                            <div style={styles.statLabel}>Monitoring</div>
                        </div>
                    </div>
                </div>

                {/* SOS Emergency Alerts */}
                {sosAlerts.filter(a => !a.resolved).length > 0 && (
                    <div style={{
                        background: 'linear-gradient(135deg, #fef2f2, #fee2e2)',
                        borderRadius: '20px',
                        padding: '1.5rem',
                        marginBottom: '1.5rem',
                        border: '2px solid #ef4444'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                background: '#ef4444',
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                animation: 'pulse 1s ease-in-out infinite'
                            }}>
                                <Bell size={22} color="white" />
                            </div>
                            <h3 style={{ margin: 0, color: '#dc2626', fontSize: '1.25rem', fontWeight: '700' }}>
                                🚨 SOS Emergency Alert
                            </h3>
                        </div>

                        {sosAlerts.filter(a => !a.resolved).map((sos, idx) => (
                            <div key={sos.id || idx} style={{
                                background: 'white',
                                borderRadius: '14px',
                                padding: '1rem',
                                marginBottom: '0.75rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                boxShadow: '0 2px 10px rgba(239, 68, 68, 0.2)'
                            }}>
                                <div style={{
                                    width: '50px',
                                    height: '50px',
                                    background: '#fef2f2',
                                    borderRadius: '14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '1.75rem'
                                }}>
                                    🆘
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h4 style={{ margin: 0, color: '#1e293b', fontWeight: '600' }}>
                                        {sos.message || 'Emergency SOS triggered'}
                                    </h4>
                                    <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                            <Clock size={14} /> {formatTime(sos.created_at)}
                                            {sos.location && (
                                                <span style={{ marginLeft: '0.5rem' }}>
                                                    📍 Lat: {sos.location.lat?.toFixed(4)}, Lng: {sos.location.lng?.toFixed(4)}
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => resolveSosAlert(sos.id)}
                                    style={{
                                        background: '#22c55e',
                                        border: 'none',
                                        color: 'white',
                                        padding: '0.75rem 1.5rem',
                                        borderRadius: '12px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.35rem'
                                    }}
                                >
                                    <CheckCircle size={18} /> Resolve
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Alerts Card */}
                <div style={styles.mainCard}>
                    <div style={styles.cardHeader}>
                        <AlertTriangle size={24} color="#f59e0b" />
                        <h3 style={styles.cardTitle}>Anomaly Alerts</h3>
                        <button
                            style={styles.trainButton}
                            onClick={trainModel}
                            disabled={training}
                            className="hover-lift"
                        >
                            {training ? <Loader size={16} className="spin" /> : <Brain size={16} />}
                            {training ? 'Training...' : 'Train Model'}
                        </button>
                    </div>

                    {alerts.length === 0 ? (
                        <div style={styles.emptyState}>
                            <div style={styles.emptyIcon}>
                                <CheckCircle size={48} color="#22c55e" />
                            </div>
                            <h4 style={{ color: '#059669', marginBottom: '0.5rem' }}>All Clear!</h4>
                            <p style={{ color: '#64748b', maxWidth: '300px', margin: '0 auto' }}>
                                No anomalies detected. The system is actively monitoring for unusual behavior patterns.
                            </p>
                        </div>
                    ) : (
                        <div>
                            {alerts.map((alert, index) => {
                                const alertConfig = ALERT_CONFIG[alert.alert_type] || { icon: '⚠️', label: 'Alert' }

                                return (
                                    <div
                                        key={alert.id || index}
                                        style={{
                                            ...styles.alertCard(alert.severity),
                                            opacity: alert.acknowledged ? 0.7 : 1
                                        }}
                                        className="alert-card"
                                    >
                                        <div style={styles.alertHeader}>
                                            <div style={styles.alertContent}>
                                                <div style={styles.alertIcon}>
                                                    {alertConfig.icon}
                                                </div>
                                                <div style={styles.alertInfo}>
                                                    <div style={styles.alertTitle}>
                                                        <h4 style={styles.alertName}>
                                                            {alert.alert_type?.replace('_', ' ')}
                                                        </h4>
                                                        <span style={styles.severityBadge(alert.severity)}>
                                                            {SEVERITY_CONFIG[alert.severity]?.label}
                                                        </span>
                                                    </div>
                                                    <p style={styles.alertReason}>{alert.prediction_reason}</p>
                                                    <div style={styles.alertMeta}>
                                                        <span style={styles.metaItem}>
                                                            <Clock size={12} /> {formatTime(alert.triggered_at)}
                                                        </span>
                                                        <span style={styles.metaItem}>
                                                            <Zap size={12} /> {Math.round((alert.confidence || 0) * 100)}% confidence
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {!alert.acknowledged ? (
                                                <div style={styles.alertActions}>
                                                    <button
                                                        style={styles.actionButton('#22c55e', '#d1fae5')}
                                                        onClick={() => acknowledgeAlert(alert.id)}
                                                        title="Acknowledge"
                                                    >
                                                        <CheckCircle size={18} />
                                                    </button>
                                                    <button
                                                        style={styles.actionButton('#ef4444', '#fee2e2')}
                                                        onClick={() => acknowledgeAlert(alert.id, true)}
                                                        title="Mark as false positive"
                                                    >
                                                        <XCircle size={18} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <span style={styles.acknowledgedBadge}>
                                                    <CheckCircle size={14} /> Done
                                                </span>
                                            )}
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
                        <Brain size={18} color="#f59e0b" />
                        How Predictive Sentinel Works
                    </h4>
                    <ul style={styles.infoList}>
                        <li><strong>Isolation Forest</strong> machine learning algorithm</li>
                        <li>Analyzes <strong>heart rate, walking speed, location, time of day</strong></li>
                        <li>Detects anomalies <strong>before</strong> incidents occur</li>
                        <li>Auto-triggers calming messages to the patient</li>
                        <li>Learns from your feedback to reduce false positives</li>
                    </ul>
                </div>
            </div>
        </div>
    )
}

export default HealthMonitor
