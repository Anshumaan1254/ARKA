import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { api } from '../services/api'
import { Users, AlertTriangle, Activity, Clock, MapPin, Check, ChevronRight, UserPlus } from 'lucide-react'
import GoogleMap from '../components/GoogleMap'
import AssignPatient from '../components/AssignPatient'

function CaretakerDashboard() {
    const { profile, supabase } = useAuth()
    const [patients, setPatients] = useState([])
    const [alerts, setAlerts] = useState([])
    const [recentLogs, setRecentLogs] = useState([])
    const [loading, setLoading] = useState(true)
    const [showAssignModal, setShowAssignModal] = useState(false)

    useEffect(() => {
        loadDashboardData()
    }, [])

    const loadDashboardData = async () => {
        try {
            const [alertsRes, logsRes] = await Promise.all([
                api.sos.list(false),
                api.recognize.logs()
            ])

            setAlerts(alertsRes.alerts || [])
            setRecentLogs((logsRes.logs || []).slice(0, 10))
        } catch (err) {
            console.error('Dashboard load error:', err)
        } finally {
            setLoading(false)
        }
    }

    const resolveAlert = async (alertId) => {
        try {
            await api.sos.resolve(alertId)
            setAlerts(alerts.filter(a => a.id !== alertId))
        } catch (err) {
            console.error('Resolve error:', err)
        }
    }

    if (loading) {
        return (
            <div className="page flex items-center justify-center">
                <div className="spinner" />
            </div>
        )
    }

    return (
        <div className="page">
            <div className="container">
                <div className="page-header" style={{ textAlign: 'left' }}>
                    <h1 className="page-title">Dashboard</h1>
                    <p className="page-subtitle">Welcome back, {profile?.full_name}</p>
                </div>

                {alerts.length > 0 && (
                    <div style={{ marginBottom: 'var(--space-6)' }}>
                        <h2 style={{
                            fontSize: 'var(--font-size-lg)',
                            marginBottom: 'var(--space-4)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-2)',
                            color: 'var(--color-error)'
                        }}>
                            <AlertTriangle size={20} />
                            Active SOS Alerts ({alerts.length})
                        </h2>

                        {/* Embedded Map for all alerts */}
                        {alerts.some(a => a.location) && (
                            <div style={{ marginBottom: 'var(--space-4)' }}>
                                <GoogleMap
                                    center={
                                        alerts.find(a => a.location)?.location
                                            ? { lat: alerts.find(a => a.location).location.lat, lng: alerts.find(a => a.location).location.lng }
                                            : undefined
                                    }
                                    zoom={14}
                                    markers={alerts
                                        .filter(a => a.location)
                                        .map(alert => ({
                                            lat: alert.location.lat,
                                            lng: alert.location.lng,
                                            title: alert.patient?.full_name || 'Patient',
                                            info: `SOS at ${new Date(alert.created_at).toLocaleTimeString()}`,
                                            animate: true
                                        }))
                                    }
                                    style={{ width: '100%', height: '300px' }}
                                />
                            </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                            {alerts.map(alert => (
                                <div
                                    key={alert.id}
                                    className="card"
                                    style={{
                                        padding: 'var(--space-4)',
                                        borderLeft: '4px solid var(--color-error)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between'
                                    }}
                                >
                                    <div>
                                        <p style={{ fontWeight: 600, marginBottom: 'var(--space-1)' }}>
                                            {alert.patient?.full_name || 'Patient'}
                                        </p>
                                        <p style={{
                                            fontSize: 'var(--font-size-sm)',
                                            color: 'var(--text-secondary)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'var(--space-2)'
                                        }}>
                                            <Clock size={14} />
                                            {new Date(alert.created_at).toLocaleString()}
                                            {alert.location && (
                                                <>
                                                    <MapPin size={14} style={{ marginLeft: 'var(--space-2)' }} />
                                                    {alert.location.lat.toFixed(4)}, {alert.location.lng.toFixed(4)}
                                                </>
                                            )}
                                        </p>
                                    </div>

                                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                                        {alert.location && (
                                            <a
                                                href={`https://maps.google.com/?q=${alert.location.lat},${alert.location.lng}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn btn-secondary"
                                                style={{ padding: 'var(--space-2) var(--space-3)' }}
                                            >
                                                <MapPin size={16} />
                                                Directions
                                            </a>
                                        )}
                                        <button
                                            onClick={() => resolveAlert(alert.id)}
                                            className="btn btn-primary"
                                            style={{ padding: 'var(--space-2) var(--space-3)' }}
                                        >
                                            <Check size={16} />
                                            Resolve
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="grid grid-2" style={{ marginBottom: 'var(--space-6)' }}>
                    <Link
                        to="/dashboard/people"
                        className="card"
                        style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                                <div style={{
                                    padding: 'var(--space-3)',
                                    background: 'var(--bg-tertiary)',
                                    borderRadius: 'var(--radius-md)',
                                    color: 'var(--color-primary)'
                                }}>
                                    <Users size={24} />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: 'var(--font-size-lg)' }}>Manage People</h3>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                                        Add faces and voice memories
                                    </p>
                                </div>
                            </div>
                            <ChevronRight size={20} style={{ color: 'var(--text-muted)' }} />
                        </div>
                    </Link>

                    <button
                        onClick={() => setShowAssignModal(true)}
                        className="card"
                        style={{ textAlign: 'left', cursor: 'pointer' }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                                <div style={{
                                    padding: 'var(--space-3)',
                                    background: 'rgba(34, 197, 94, 0.1)',
                                    borderRadius: 'var(--radius-md)',
                                    color: 'var(--color-success)'
                                }}>
                                    <UserPlus size={24} />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: 'var(--font-size-lg)' }}>Assign Patient</h3>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                                        Link a patient to your care
                                    </p>
                                </div>
                            </div>
                            <ChevronRight size={20} style={{ color: 'var(--text-muted)' }} />
                        </div>
                    </button>
                </div>

                <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                        <div style={{
                            padding: 'var(--space-3)',
                            background: 'rgba(59, 130, 246, 0.1)',
                            borderRadius: 'var(--radius-md)',
                            color: 'var(--color-info)'
                        }}>
                            <Activity size={24} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: 'var(--font-size-lg)' }}>Recent Activity</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                                {recentLogs.length} recognition events
                            </p>
                        </div>
                    </div>
                </div>

                {recentLogs.length > 0 && (
                    <div>
                        <h2 style={{
                            fontSize: 'var(--font-size-lg)',
                            marginBottom: 'var(--space-4)'
                        }}>
                            Recognition History
                        </h2>

                        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: 'var(--bg-secondary)' }}>
                                        <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'left', fontSize: 'var(--font-size-sm)' }}>
                                            Time
                                        </th>
                                        <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'left', fontSize: 'var(--font-size-sm)' }}>
                                            Person
                                        </th>
                                        <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'left', fontSize: 'var(--font-size-sm)' }}>
                                            Confidence
                                        </th>
                                        <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'left', fontSize: 'var(--font-size-sm)' }}>
                                            Status
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentLogs.map(log => (
                                        <tr key={log.id} style={{ borderTop: '1px solid var(--border-light)' }}>
                                            <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--font-size-sm)' }}>
                                                {new Date(log.created_at).toLocaleString()}
                                            </td>
                                            <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                                                {log.person?.name || 'Unknown'}
                                            </td>
                                            <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                                                {log.confidence ? `${Math.round(log.confidence)}%` : '-'}
                                            </td>
                                            <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                                                <span className={`badge ${log.matched ? 'badge-success' : 'badge-warning'}`}>
                                                    {log.matched ? 'Matched' : 'No Match'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Assign Patient Modal */}
            {showAssignModal && (
                <AssignPatient
                    onClose={() => setShowAssignModal(false)}
                    onAssigned={() => loadDashboardData()}
                />
            )}
        </div>
    )
}

export default CaretakerDashboard
