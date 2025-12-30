import { useState } from 'react'
import {
    Brain,
    TrendingUp,
    TrendingDown,
    AlertCircle,
    CheckCircle,
    AlertTriangle,
    Activity,
    Clock,
    FileText,
    Download
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
    Area,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
    Legend
} from 'recharts'

// Mock data
const weeklyScores = [
    { day: 'Mon', score: 72, speech: 75, memory: 68, attention: 74 },
    { day: 'Tue', score: 75, speech: 78, memory: 71, attention: 76 },
    { day: 'Wed', score: 68, speech: 65, memory: 70, attention: 69 },
    { day: 'Thu', score: 78, speech: 80, memory: 75, attention: 79 },
    { day: 'Fri', score: 82, speech: 84, memory: 78, attention: 84 },
    { day: 'Sat', score: 79, speech: 81, memory: 76, attention: 80 },
    { day: 'Sun', score: 85, speech: 88, memory: 82, attention: 85 },
]

const cognitiveAreas = [
    { area: 'Speech', value: 85, fullMark: 100 },
    { area: 'Memory', value: 72, fullMark: 100 },
    { area: 'Attention', value: 80, fullMark: 100 },
    { area: 'Recognition', value: 88, fullMark: 100 },
    { area: 'Orientation', value: 75, fullMark: 100 },
    { area: 'Reasoning', value: 70, fullMark: 100 },
]

const speechAnalysis = [
    { indicator: 'Hesitation', score: 15, status: 'good' },
    { indicator: 'Repetition', score: 22, status: 'moderate' },
    { indicator: 'Word Finding', score: 18, status: 'good' },
    { indicator: 'Coherence', score: 85, status: 'excellent' },
]

const alerts = [
    {
        id: 1,
        type: 'info',
        title: 'Speech Pattern Stable',
        message: 'Speech analysis shows consistent patterns over the past week.',
        time: '2 hours ago'
    },
    {
        id: 2,
        type: 'warning',
        title: 'Memory Score Dip Detected',
        message: 'Memory performance dropped 8% on Wednesday. Consider additional exercises.',
        time: 'Yesterday'
    },
    {
        id: 3,
        type: 'success',
        title: 'Weekly Improvement',
        message: 'Overall cognitive score improved 5% compared to last week!',
        time: '2 days ago'
    },
]

function CognitiveHealth() {
    const [selectedPeriod, setSelectedPeriod] = useState('week')
    const currentScore = 85
    const previousScore = 80

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Cognitive Health Monitoring</h1>
                <p className="page-subtitle">
                    Track cognitive performance, speech patterns, and detect early signs of decline
                </p>
            </div>

            {/* Stats Overview */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <p className="stat-label">Current Score</p>
                            <p className="stat-value" style={{ color: '#10b981' }}>{currentScore}%</p>
                            <div className="stat-change positive">
                                <TrendingUp size={12} />
                                +{currentScore - previousScore}% from last week
                            </div>
                        </div>
                        <div className="card-icon success">
                            <Brain size={20} color="white" />
                        </div>
                    </div>
                </div>

                <div className="stat-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <p className="stat-label">Speech Score</p>
                            <p className="stat-value">88%</p>
                            <span style={{ color: 'var(--success)', fontSize: '0.875rem', fontWeight: 500 }}>
                                Excellent
                            </span>
                        </div>
                        <div className="card-icon primary">
                            <Activity size={20} color="white" />
                        </div>
                    </div>
                </div>

                <div className="stat-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <p className="stat-label">Memory Score</p>
                            <p className="stat-value" style={{ color: '#f59e0b' }}>72%</p>
                            <span style={{ color: 'var(--warning)', fontSize: '0.875rem', fontWeight: 500 }}>
                                Needs Attention
                            </span>
                        </div>
                        <div className="card-icon warning">
                            <AlertTriangle size={20} color="white" />
                        </div>
                    </div>
                </div>

                <div className="stat-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <p className="stat-label">Trajectory</p>
                            <p className="stat-value" style={{ fontSize: '1.5rem' }}>Improving</p>
                            <span style={{ color: 'var(--success)', fontSize: '0.875rem', fontWeight: 500 }}>
                                Consistent progress
                            </span>
                        </div>
                        <div className="card-icon success">
                            <TrendingUp size={20} color="white" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts */}
            <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Cognitive Score Trend</h3>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {['week', 'month', '3months'].map((period) => (
                                <button
                                    key={period}
                                    onClick={() => setSelectedPeriod(period)}
                                    className={`btn ${selectedPeriod === period ? 'btn-primary' : 'btn-secondary'}`}
                                    style={{ padding: '0.5rem 1rem', fontSize: '0.75rem' }}
                                >
                                    {period === 'week' ? '7D' : period === 'month' ? '30D' : '90D'}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={weeklyScores}>
                                <defs>
                                    <linearGradient id="colorCognitive" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
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
                                    stroke="#10b981"
                                    strokeWidth={3}
                                    fill="url(#colorCognitive)"
                                    name="Overall Score"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Cognitive Areas Breakdown</h3>
                    </div>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={cognitiveAreas}>
                                <PolarGrid stroke="rgba(255,255,255,0.2)" />
                                <PolarAngleAxis dataKey="area" stroke="#94a3b8" />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#64748b" />
                                <Radar
                                    name="Current"
                                    dataKey="value"
                                    stroke="#0066e6"
                                    fill="#0066e6"
                                    fillOpacity={0.3}
                                    strokeWidth={2}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Speech Analysis and Alerts */}
            <div className="grid-2">
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Speech Pattern Analysis</h3>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                            Last 24 hours
                        </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {speechAnalysis.map((item) => (
                            <div key={item.indicator}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span style={{ fontWeight: 500 }}>{item.indicator}</span>
                                    <span style={{
                                        color: item.status === 'excellent' ? 'var(--success)' :
                                            item.status === 'good' ? 'var(--info)' : 'var(--warning)',
                                        fontSize: '0.875rem',
                                        fontWeight: 500
                                    }}>
                                        {item.indicator === 'Coherence' ? `${item.score}%` : `${item.score}%`}
                                    </span>
                                </div>
                                <div style={{
                                    height: '8px',
                                    background: 'rgba(255,255,255,0.1)',
                                    borderRadius: '4px',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{
                                        width: `${item.score}%`,
                                        height: '100%',
                                        background: item.status === 'excellent' ? 'var(--gradient-success)' :
                                            item.status === 'good' ? 'var(--gradient-primary)' : 'var(--gradient-warning)',
                                        borderRadius: '4px'
                                    }} />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)' }}>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                            <strong style={{ color: 'var(--text-primary)' }}>AI Insight:</strong> Speech patterns are consistent.
                            Minor hesitation detected during morning hours - consider scheduling important conversations in the afternoon.
                        </p>
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Cognitive Alerts</h3>
                        <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.75rem' }}>
                            <FileText size={14} />
                            Download Report
                        </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {alerts.map((alert) => (
                            <div key={alert.id} className={`alert-card ${alert.type}`}>
                                {alert.type === 'success' && <CheckCircle size={20} />}
                                {alert.type === 'warning' && <AlertTriangle size={20} />}
                                {alert.type === 'info' && <AlertCircle size={20} />}
                                <div style={{ flex: 1 }}>
                                    <p style={{ fontWeight: 600 }}>{alert.title}</p>
                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                        {alert.message}
                                    </p>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                        <Clock size={12} style={{ display: 'inline', marginRight: '0.25rem' }} />
                                        {alert.time}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default CognitiveHealth
