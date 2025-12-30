import { useState } from 'react'
import {
    GraduationCap,
    Trophy,
    Target,
    Star,
    TrendingUp,
    Users,
    Clock,
    Award,
    CheckCircle,
    Play
} from 'lucide-react'
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts'

const progressData = [
    { week: 'Week 1', accuracy: 45, sessions: 5 },
    { week: 'Week 2', accuracy: 52, sessions: 7 },
    { week: 'Week 3', accuracy: 58, sessions: 8 },
    { week: 'Week 4', accuracy: 65, sessions: 10 },
    { week: 'Week 5', accuracy: 72, sessions: 12 },
    { week: 'Week 6', accuracy: 78, sessions: 11 },
]

const memoryStrengths = [
    { id: 1, name: 'Sarah (Daughter)', strength: 92, level: 'Strong', lastReview: '2 days ago' },
    { id: 2, name: 'Michael (Son)', strength: 85, level: 'Strong', lastReview: '1 day ago' },
    { id: 3, name: 'Dr. Smith', strength: 68, level: 'Moderate', lastReview: '3 days ago' },
    { id: 4, name: 'Neighbor John', strength: 45, level: 'Weak', lastReview: '5 days ago' },
    { id: 5, name: 'Nurse Emma', strength: 72, level: 'Moderate', lastReview: '2 days ago' },
]

const achievements = [
    { id: 1, name: 'First Steps', description: 'Complete first training session', icon: '🎯', earned: true },
    { id: 2, name: '7-Day Streak', description: 'Train for 7 consecutive days', icon: '🔥', earned: true },
    { id: 3, name: 'Memory Master', description: 'Reach 80% accuracy', icon: '🧠', earned: false, progress: 78 },
    { id: 4, name: 'Social Star', description: 'Remember 10 people', icon: '⭐', earned: false, progress: 5 },
]

const familyEngagement = [
    { id: 1, name: 'Sarah', visits: 8, points: 120, avatar: 'S' },
    { id: 2, name: 'Michael', visits: 5, points: 85, avatar: 'M' },
    { id: 3, name: 'Emma', visits: 3, points: 45, avatar: 'E' },
]

function MemoryTraining() {
    const [activeTab, setActiveTab] = useState('overview')

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Memory Training Progress</h1>
                <p className="page-subtitle">
                    Track memory training sessions, achievements, and family engagement
                </p>
            </div>

            {/* Stats */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <p className="stat-label">Overall Accuracy</p>
                            <p className="stat-value" style={{ color: '#10b981' }}>78%</p>
                            <div className="stat-change positive">
                                <TrendingUp size={12} />
                                +15% from start
                            </div>
                        </div>
                        <div className="card-icon success">
                            <Target size={20} color="white" />
                        </div>
                    </div>
                </div>

                <div className="stat-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <p className="stat-label">Current Streak</p>
                            <p className="stat-value">12 days</p>
                            <span style={{ color: 'var(--warning)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                🔥 Personal best!
                            </span>
                        </div>
                        <div className="card-icon warning">
                            <Trophy size={20} color="white" />
                        </div>
                    </div>
                </div>

                <div className="stat-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <p className="stat-label">Total Sessions</p>
                            <p className="stat-value">53</p>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                                11 this week
                            </span>
                        </div>
                        <div className="card-icon primary">
                            <GraduationCap size={20} color="white" />
                        </div>
                    </div>
                </div>

                <div className="stat-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <p className="stat-label">People Remembered</p>
                            <p className="stat-value">5</p>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                                Strong memories
                            </span>
                        </div>
                        <div className="card-icon primary">
                            <Users size={20} color="white" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
                {/* Progress Chart */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Training Progress</h3>
                        <button className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                            <Play size={14} />
                            Start Session
                        </button>
                    </div>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={progressData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis dataKey="week" stroke="#64748b" />
                                <YAxis stroke="#64748b" domain={[0, 100]} />
                                <Tooltip
                                    contentStyle={{
                                        background: 'rgba(30, 41, 59, 0.95)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px'
                                    }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="accuracy"
                                    stroke="#0066e6"
                                    strokeWidth={3}
                                    dot={{ fill: '#0066e6', strokeWidth: 2 }}
                                    name="Accuracy %"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Memory Strengths */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Memory Strengths</h3>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                            People recognition
                        </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {memoryStrengths.map((person) => (
                            <div key={person.id}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span style={{ fontWeight: 500 }}>{person.name}</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span className={`status-badge ${person.level === 'Strong' ? 'safe' :
                                                person.level === 'Moderate' ? 'warning' : 'alert'
                                            }`}>
                                            {person.strength}%
                                        </span>
                                    </div>
                                </div>
                                <div style={{
                                    height: '6px',
                                    background: 'rgba(255,255,255,0.1)',
                                    borderRadius: '3px',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{
                                        width: `${person.strength}%`,
                                        height: '100%',
                                        background: person.level === 'Strong' ? 'var(--gradient-success)' :
                                            person.level === 'Moderate' ? 'var(--gradient-warning)' : 'var(--gradient-danger)',
                                        borderRadius: '3px'
                                    }} />
                                </div>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                    <Clock size={10} style={{ display: 'inline', marginRight: '0.25rem' }} />
                                    Last reviewed: {person.lastReview}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid-2">
                {/* Achievements */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Achievements</h3>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                            2/4 earned
                        </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                        {achievements.map((achievement) => (
                            <div
                                key={achievement.id}
                                style={{
                                    padding: '1rem',
                                    background: achievement.earned ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-glass)',
                                    borderRadius: 'var(--radius-md)',
                                    border: achievement.earned ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255,255,255,0.1)',
                                    opacity: achievement.earned ? 1 : 0.7
                                }}
                            >
                                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
                                    {achievement.icon}
                                </div>
                                <h4 style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{achievement.name}</h4>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                    {achievement.description}
                                </p>
                                {achievement.earned ? (
                                    <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--success)' }}>
                                        <CheckCircle size={14} />
                                        <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>Earned!</span>
                                    </div>
                                ) : (
                                    <div style={{ marginTop: '0.5rem' }}>
                                        <div style={{
                                            height: '4px',
                                            background: 'rgba(255,255,255,0.1)',
                                            borderRadius: '2px',
                                            overflow: 'hidden'
                                        }}>
                                            <div style={{
                                                width: `${(achievement.progress / 10) * 100}%`,
                                                height: '100%',
                                                background: 'var(--gradient-primary)',
                                                borderRadius: '2px'
                                            }} />
                                        </div>
                                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                            {achievement.progress}/10
                                        </p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Family Engagement */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Family Engagement</h3>
                        <Award size={20} style={{ color: 'var(--warning)' }} />
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                        Family members earn points for visits and interactions, helping strengthen memories!
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {familyEngagement.map((member, index) => (
                            <div
                                key={member.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1rem',
                                    padding: '1rem',
                                    background: index === 0 ? 'rgba(245, 158, 11, 0.1)' : 'var(--bg-glass)',
                                    borderRadius: 'var(--radius-md)',
                                    border: index === 0 ? '1px solid rgba(245, 158, 11, 0.3)' : 'none'
                                }}
                            >
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    background: index === 0 ? 'var(--gradient-warning)' : 'var(--gradient-primary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 600
                                }}>
                                    {member.avatar}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <p style={{ fontWeight: 500 }}>{member.name}</p>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                        {member.visits} visits this month
                                    </p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ fontWeight: 600, color: 'var(--warning)' }}>{member.points} pts</p>
                                    {index === 0 && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                            <Trophy size={12} style={{ color: 'var(--warning)' }} />
                                            <span style={{ fontSize: '0.7rem', color: 'var(--warning)' }}>#1</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default MemoryTraining
