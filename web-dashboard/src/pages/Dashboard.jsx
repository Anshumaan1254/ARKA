import { useState, useEffect } from 'react'
import {
    Brain,
    MapPin,
    Pill,
    Heart,
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    CheckCircle,
    Clock,
    Users,
    Activity
} from 'lucide-react'
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts'

// Mock data
const cognitiveData = [
    { day: 'Mon', score: 72 },
    { day: 'Tue', score: 75 },
    { day: 'Wed', score: 68 },
    { day: 'Thu', score: 78 },
    { day: 'Fri', score: 82 },
    { day: 'Sat', score: 79 },
    { day: 'Sun', score: 85 },
]

const recentAlerts = [
    { id: 1, type: 'success', message: 'Morning medication taken on time', time: '8:30 AM' },
    { id: 2, type: 'info', message: 'Memory training session completed', time: '10:15 AM' },
    { id: 3, type: 'warning', message: 'Missed afternoon medication reminder', time: '2:00 PM' },
]

const upcomingReminders = [
    { id: 1, name: 'Evening Medication', time: '6:00 PM', type: 'medication' },
    { id: 2, name: 'Memory Exercise', time: '7:30 PM', type: 'training' },
    { id: 3, name: 'Video Call with Sarah', time: '8:00 PM', type: 'social' },
]

function Dashboard() {
    const [currentTime, setCurrentTime] = useState(new Date())

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000)
        return () => clearInterval(timer)
    }, [])

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Welcome Back, Caregiver</h1>
                <p className="page-subtitle">
                    {currentTime.toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    })} · {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </p>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
                <div className="stat-card animate-fadeInUp" style={{ animationDelay: '0ms' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <p className="stat-label">Cognitive Score</p>
                            <p className="stat-value" style={{ color: '#10b981' }}>85%</p>
                            <div className="stat-change positive">
                                <TrendingUp size={12} />
                                +5% from last week
                            </div>
                        </div>
                        <div className="card-icon primary">
                            <Brain size={20} color="white" />
                        </div>
                    </div>
                </div>

                <div className="stat-card animate-fadeInUp" style={{ animationDelay: '100ms' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <p className="stat-label">Medication Adherence</p>
                            <p className="stat-value" style={{ color: '#f59e0b' }}>92%</p>
                            <div className="stat-change negative">
                                <TrendingDown size={12} />
                                -3% from last week
                            </div>
                        </div>
                        <div className="card-icon warning">
                            <Pill size={20} color="white" />
                        </div>
                    </div>
                </div>

                <div className="stat-card animate-fadeInUp" style={{ animationDelay: '200ms' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <p className="stat-label">Training Sessions</p>
                            <p className="stat-value">12</p>
                            <div className="stat-change positive">
                                <TrendingUp size={12} />
                                3 more than usual
                            </div>
                        </div>
                        <div className="card-icon success">
                            <Activity size={20} color="white" />
                        </div>
                    </div>
                </div>

                <div className="stat-card animate-fadeInUp" style={{ animationDelay: '300ms' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <p className="stat-label">Family Connections</p>
                            <p className="stat-value">8</p>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                                This week
                            </span>
                        </div>
                        <div className="card-icon primary">
                            <Users size={20} color="white" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts and Activity */}
            <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
                <div className="card animate-fadeInUp" style={{ animationDelay: '400ms' }}>
                    <div className="card-header">
                        <h3 className="card-title">Cognitive Health Trend</h3>
                        <span style={{
                            color: 'var(--success)',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                        }}>
                            <TrendingUp size={16} /> Improving
                        </span>
                    </div>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={cognitiveData}>
                                <defs>
                                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#0066e6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#0066e6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis dataKey="day" stroke="#64748b" />
                                <YAxis stroke="#64748b" domain={[0, 100]} />
                                <Tooltip
                                    contentStyle={{
                                        background: 'rgba(30, 41, 59, 0.95)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px'
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="score"
                                    stroke="#0066e6"
                                    strokeWidth={3}
                                    fill="url(#colorScore)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="card animate-fadeInUp" style={{ animationDelay: '500ms' }}>
                    <div className="card-header">
                        <h3 className="card-title">Recent Activity</h3>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                            Today
                        </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {recentAlerts.map((alert) => (
                            <div key={alert.id} className={`alert-card ${alert.type}`}>
                                {alert.type === 'success' && <CheckCircle size={20} />}
                                {alert.type === 'warning' && <AlertTriangle size={20} />}
                                {alert.type === 'info' && <Brain size={20} />}
                                <div style={{ flex: 1 }}>
                                    <p style={{ fontWeight: 500 }}>{alert.message}</p>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                        {alert.time}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Location and Reminders */}
            <div className="grid-2">
                <div className="card animate-fadeInUp" style={{ animationDelay: '600ms' }}>
                    <div className="card-header">
                        <h3 className="card-title">Current Location</h3>
                        <div className="status-badge safe">
                            <span className="pulse"></span>
                            Safe Zone
                        </div>
                    </div>
                    <div className="map-container">
                        <div className="map-placeholder">
                            <MapPin size={48} style={{ marginBottom: '1rem', color: 'var(--primary-500)' }} />
                            <p style={{ fontWeight: 500 }}>123 Main Street, Home</p>
                            <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                                Last updated: {currentTime.toLocaleTimeString()}
                            </p>
                            <div style={{
                                marginTop: '1rem',
                                padding: '0.75rem 1.5rem',
                                background: 'var(--gradient-primary)',
                                borderRadius: 'var(--radius-md)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                fontWeight: 500
                            }}>
                                <Heart size={16} />
                                Within Safe Zone
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card animate-fadeInUp" style={{ animationDelay: '700ms' }}>
                    <div className="card-header">
                        <h3 className="card-title">Upcoming Reminders</h3>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                            Next 4 hours
                        </span>
                    </div>
                    <div className="medication-list">
                        {upcomingReminders.map((reminder) => (
                            <div key={reminder.id} className="medication-item">
                                <div className="medication-info">
                                    <div className="icon">
                                        {reminder.type === 'medication' && <Pill size={18} color="white" />}
                                        {reminder.type === 'training' && <Brain size={18} color="white" />}
                                        {reminder.type === 'social' && <Users size={18} color="white" />}
                                    </div>
                                    <div>
                                        <p className="medication-name">{reminder.name}</p>
                                        <p className="medication-time">{reminder.time}</p>
                                    </div>
                                </div>
                                <div className="medication-status">
                                    <Clock size={16} style={{ color: 'var(--text-secondary)' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Dashboard
