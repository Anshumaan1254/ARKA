import { useState } from 'react'
import {
    Pill,
    Clock,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Plus,
    Calendar,
    TrendingUp,
    Bell
} from 'lucide-react'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts'

const medications = [
    {
        id: 1,
        name: 'Donepezil',
        dosage: '10mg',
        times: ['8:00 AM', '8:00 PM'],
        taken: [true, false],
        purpose: 'Memory enhancement'
    },
    {
        id: 2,
        name: 'Memantine',
        dosage: '5mg',
        times: ['12:00 PM'],
        taken: [true],
        purpose: 'Cognitive function'
    },
    {
        id: 3,
        name: 'Vitamin D',
        dosage: '1000 IU',
        times: ['8:00 AM'],
        taken: [true],
        purpose: 'Bone health'
    },
    {
        id: 4,
        name: 'Aspirin',
        dosage: '81mg',
        times: ['8:00 AM'],
        taken: [true],
        purpose: 'Heart health'
    },
]

const weeklyAdherence = [
    { day: 'Mon', adherence: 100 },
    { day: 'Tue', adherence: 100 },
    { day: 'Wed', adherence: 75 },
    { day: 'Thu', adherence: 100 },
    { day: 'Fri', adherence: 100 },
    { day: 'Sat', adherence: 87 },
    { day: 'Sun', adherence: 92 },
]

const upcomingDoses = [
    { id: 1, name: 'Donepezil', dosage: '10mg', time: '8:00 PM', status: 'upcoming' },
]

const missedDoses = [
    { id: 1, name: 'Donepezil', dosage: '10mg', time: 'Yesterday 8:00 PM', reason: 'Forgot' },
]

function MedicationTracker() {
    const [selectedView, setSelectedView] = useState('today')
    const overallAdherence = 92

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Medication Tracker</h1>
                <p className="page-subtitle">
                    Track medication schedules, adherence, and set reminders
                </p>
            </div>

            {/* Stats */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <p className="stat-label">Weekly Adherence</p>
                            <p className="stat-value" style={{ color: overallAdherence >= 90 ? '#10b981' : '#f59e0b' }}>
                                {overallAdherence}%
                            </p>
                            <div className="stat-change positive">
                                <TrendingUp size={12} />
                                +3% from last week
                            </div>
                        </div>
                        <div className="card-icon success">
                            <Pill size={20} color="white" />
                        </div>
                    </div>
                </div>

                <div className="stat-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <p className="stat-label">Today's Doses</p>
                            <p className="stat-value">5/6</p>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                                1 upcoming at 8:00 PM
                            </span>
                        </div>
                        <div className="card-icon primary">
                            <CheckCircle size={20} color="white" />
                        </div>
                    </div>
                </div>

                <div className="stat-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <p className="stat-label">Active Medications</p>
                            <p className="stat-value">4</p>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                                All schedules active
                            </span>
                        </div>
                        <div className="card-icon primary">
                            <Calendar size={20} color="white" />
                        </div>
                    </div>
                </div>

                <div className="stat-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <p className="stat-label">Missed This Week</p>
                            <p className="stat-value" style={{ color: '#f59e0b' }}>2</p>
                            <span style={{ color: 'var(--warning)', fontSize: '0.875rem' }}>
                                Review needed
                            </span>
                        </div>
                        <div className="card-icon warning">
                            <AlertTriangle size={20} color="white" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
                {/* Adherence Chart */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Weekly Adherence</h3>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                            This Week
                        </span>
                    </div>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={weeklyAdherence}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis dataKey="day" stroke="#64748b" />
                                <YAxis stroke="#64748b" domain={[0, 100]} />
                                <Tooltip
                                    contentStyle={{
                                        background: 'rgba(30, 41, 59, 0.95)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px'
                                    }}
                                    formatter={(value) => [`${value}%`, 'Adherence']}
                                />
                                <Bar dataKey="adherence" radius={[4, 4, 0, 0]}>
                                    {weeklyAdherence.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={entry.adherence === 100 ? '#10b981' : entry.adherence >= 80 ? '#f59e0b' : '#ef4444'}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Upcoming & Missed */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Alerts</h3>
                    </div>

                    {/* Upcoming */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <h4 style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                            UPCOMING
                        </h4>
                        {upcomingDoses.map((dose) => (
                            <div key={dose.id} className="alert-card info">
                                <Clock size={20} />
                                <div style={{ flex: 1 }}>
                                    <p style={{ fontWeight: 500 }}>{dose.name} {dose.dosage}</p>
                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                        Due at {dose.time}
                                    </p>
                                </div>
                                <button className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.75rem' }}>
                                    <Bell size={14} />
                                    Remind
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Missed */}
                    <div>
                        <h4 style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                            MISSED
                        </h4>
                        {missedDoses.map((dose) => (
                            <div key={dose.id} className="alert-card warning">
                                <XCircle size={20} />
                                <div style={{ flex: 1 }}>
                                    <p style={{ fontWeight: 500 }}>{dose.name} {dose.dosage}</p>
                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                        {dose.time} · {dose.reason}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Medication List */}
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">All Medications</h3>
                    <button className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                        <Plus size={16} />
                        Add Medication
                    </button>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                    Medication
                                </th>
                                <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                    Dosage
                                </th>
                                <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                    Schedule
                                </th>
                                <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                    Purpose
                                </th>
                                <th style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                    Today's Status
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {medications.map((med) => (
                                <tr key={med.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={{
                                                width: '36px',
                                                height: '36px',
                                                borderRadius: 'var(--radius-md)',
                                                background: 'var(--gradient-primary)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                <Pill size={16} color="white" />
                                            </div>
                                            <span style={{ fontWeight: 500 }}>{med.name}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{med.dosage}</td>
                                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{med.times.join(', ')}</td>
                                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{med.purpose}</td>
                                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                                            {med.taken.map((taken, idx) => (
                                                <div
                                                    key={idx}
                                                    className={`status-badge ${taken ? 'safe' : 'warning'}`}
                                                >
                                                    {taken ? <CheckCircle size={12} /> : <Clock size={12} />}
                                                    {med.times[idx]}
                                                </div>
                                            ))}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

export default MedicationTracker
