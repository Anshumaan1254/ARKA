import { useState } from 'react'
import {
    MapPin,
    Home,
    Shield,
    AlertTriangle,
    Clock,
    Navigation,
    Settings,
    Bell,
    CheckCircle
} from 'lucide-react'

const locationHistory = [
    { id: 1, location: 'Home', time: '10:30 AM - Present', status: 'safe', duration: '2h 15m' },
    { id: 2, location: 'Garden', time: '9:45 AM - 10:30 AM', status: 'safe', duration: '45m' },
    { id: 3, location: 'Living Room', time: '8:00 AM - 9:45 AM', status: 'safe', duration: '1h 45m' },
    { id: 4, location: 'Kitchen', time: '7:30 AM - 8:00 AM', status: 'safe', duration: '30m' },
]

const safeZones = [
    { id: 1, name: 'Home', address: '123 Main Street', radius: '100m', active: true },
    { id: 2, name: 'Sarah\'s House', address: '456 Oak Avenue', radius: '50m', active: true },
    { id: 3, name: 'Park', address: 'Central Park', radius: '200m', active: true },
]

function LocationTracker() {
    const [showSettings, setShowSettings] = useState(false)

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Location Tracker</h1>
                <p className="page-subtitle">
                    Real-time GPS tracking and geofence monitoring for patient safety
                </p>
            </div>

            {/* Current Status Banner */}
            <div className="card" style={{
                marginBottom: '1.5rem',
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%)',
                borderColor: 'rgba(16, 185, 129, 0.3)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                            width: '60px',
                            height: '60px',
                            borderRadius: '50%',
                            background: 'var(--gradient-success)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Shield size={28} color="white" />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Currently Safe at Home</h2>
                            <p style={{ color: 'var(--text-secondary)' }}>
                                <Clock size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
                                Last updated: Just now · Within safe zone for 2 hours 15 minutes
                            </p>
                        </div>
                    </div>
                    <div className="status-badge safe" style={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }}>
                        <span className="pulse"></span>
                        All Clear
                    </div>
                </div>
            </div>

            <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
                {/* Map */}
                <div className="card" style={{ gridColumn: 'span 1' }}>
                    <div className="card-header">
                        <h3 className="card-title">Live Location</h3>
                        <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.75rem' }}>
                            <Navigation size={14} />
                            Get Directions
                        </button>
                    </div>
                    <div className="map-container" style={{ height: '350px' }}>
                        <div className="map-placeholder">
                            <div style={{
                                width: '120px',
                                height: '120px',
                                borderRadius: '50%',
                                border: '3px dashed rgba(16, 185, 129, 0.5)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: '1rem',
                                position: 'relative'
                            }}>
                                <div style={{
                                    width: '80px',
                                    height: '80px',
                                    borderRadius: '50%',
                                    background: 'rgba(16, 185, 129, 0.2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <MapPin size={32} color="var(--success)" />
                                </div>
                            </div>
                            <p style={{ fontWeight: 600, fontSize: '1.125rem' }}>123 Main Street</p>
                            <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Home - Living Room Area</p>
                            <p style={{ fontSize: '0.875rem', marginTop: '1rem', color: 'var(--text-muted)' }}>
                                Accuracy: ±5 meters
                            </p>
                        </div>
                    </div>
                </div>

                {/* Safe Zones */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Safe Zones</h3>
                        <button
                            className="btn btn-secondary"
                            style={{ padding: '0.5rem 1rem', fontSize: '0.75rem' }}
                            onClick={() => setShowSettings(!showSettings)}
                        >
                            <Settings size={14} />
                            Manage
                        </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {safeZones.map((zone) => (
                            <div key={zone.id} className="medication-item">
                                <div className="medication-info">
                                    <div className="icon" style={{
                                        background: zone.active ? 'var(--gradient-success)' : 'var(--bg-glass)'
                                    }}>
                                        <Home size={18} color="white" />
                                    </div>
                                    <div>
                                        <p className="medication-name">{zone.name}</p>
                                        <p className="medication-time">{zone.address} · {zone.radius} radius</p>
                                    </div>
                                </div>
                                <div className="status-badge safe">
                                    <CheckCircle size={14} />
                                    Active
                                </div>
                            </div>
                        ))}
                    </div>
                    <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                        + Add New Safe Zone
                    </button>
                </div>
            </div>

            {/* Location History */}
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">Location History</h3>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Today</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {locationHistory.map((entry, index) => (
                        <div
                            key={entry.id}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                padding: '1rem',
                                background: index === 0 ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-glass)',
                                borderRadius: 'var(--radius-md)',
                                borderLeft: index === 0 ? '3px solid var(--success)' : 'none'
                            }}
                        >
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                background: 'var(--gradient-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <MapPin size={18} color="white" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <p style={{ fontWeight: 500 }}>{entry.location}</p>
                                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{entry.time}</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div className="status-badge safe" style={{ marginBottom: '0.25rem' }}>
                                    Safe Zone
                                </div>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{entry.duration}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default LocationTracker
