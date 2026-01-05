import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { api } from '../services/api'
import { Camera, Scan, AlertTriangle, MapPin } from 'lucide-react'

function PatientHome() {
    const { profile } = useAuth()
    const [sosLoading, setSosLoading] = useState(false)
    const [sosSuccess, setSosSuccess] = useState(false)

    const handleSOS = async () => {
        setSosLoading(true)

        try {
            let location = null

            if (navigator.geolocation) {
                try {
                    const position = await new Promise((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject, {
                            timeout: 10000,
                            enableHighAccuracy: true
                        })
                    })

                    location = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    }
                } catch (geoErr) {
                    console.log('Could not get location:', geoErr)
                }
            }

            await api.sos.send(location, 'Emergency SOS triggered')
            setSosSuccess(true)

            setTimeout(() => setSosSuccess(false), 5000)
        } catch (err) {
            console.error('SOS error:', err)
            alert('Could not send SOS. Please try again or call for help directly.')
        } finally {
            setSosLoading(false)
        }
    }

    return (
        <div className="page">
            <div className="container">
                <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
                    <h1 style={{
                        fontSize: 'var(--font-size-3xl)',
                        marginBottom: 'var(--space-2)'
                    }}>
                        Hello, {profile?.full_name?.split(' ')[0] || 'Friend'} 💚
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-lg)' }}>
                        How can I help you today?
                    </p>
                </div>

                <div className="grid grid-2" style={{
                    maxWidth: '600px',
                    margin: '0 auto',
                    gap: 'var(--space-6)'
                }}>
                    <Link
                        to="/patient/recognize"
                        className="card"
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            textAlign: 'center',
                            padding: 'var(--space-8)',
                            textDecoration: 'none',
                            color: 'inherit'
                        }}
                    >
                        <div style={{
                            padding: 'var(--space-5)',
                            background: 'var(--bg-tertiary)',
                            borderRadius: 'var(--radius-full)',
                            marginBottom: 'var(--space-4)',
                            color: 'var(--color-primary)'
                        }}>
                            <Camera size={48} />
                        </div>
                        <h2 style={{ fontSize: 'var(--font-size-xl)', marginBottom: 'var(--space-2)' }}>
                            Who Is This?
                        </h2>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            Recognize faces of people
                        </p>
                    </Link>

                    <Link
                        to="/patient/objects"
                        className="card"
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            textAlign: 'center',
                            padding: 'var(--space-8)',
                            textDecoration: 'none',
                            color: 'inherit'
                        }}
                    >
                        <div style={{
                            padding: 'var(--space-5)',
                            background: 'rgba(59, 130, 246, 0.1)',
                            borderRadius: 'var(--radius-full)',
                            marginBottom: 'var(--space-4)',
                            color: 'var(--color-info)'
                        }}>
                            <Scan size={48} />
                        </div>
                        <h2 style={{ fontSize: 'var(--font-size-xl)', marginBottom: 'var(--space-2)' }}>
                            What Is This?
                        </h2>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            Identify objects around you
                        </p>
                    </Link>
                </div>

                <div style={{
                    maxWidth: '600px',
                    margin: 'var(--space-10) auto 0',
                    textAlign: 'center'
                }}>
                    <button
                        onClick={handleSOS}
                        disabled={sosLoading || sosSuccess}
                        className="btn btn-sos"
                        style={{ width: '100%', maxWidth: '300px' }}
                    >
                        {sosLoading ? (
                            <>
                                <span className="spinner" style={{ width: '24px', height: '24px', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} />
                                Sending...
                            </>
                        ) : sosSuccess ? (
                            <>
                                <MapPin size={28} />
                                Help Is Coming!
                            </>
                        ) : (
                            <>
                                <AlertTriangle size={28} />
                                SOS - Get Help
                            </>
                        )}
                    </button>

                    {sosSuccess && (
                        <p style={{
                            marginTop: 'var(--space-4)',
                            color: 'var(--color-success)',
                            fontWeight: 500
                        }}>
                            Your caretaker has been notified with your location.
                        </p>
                    )}

                    <p style={{
                        marginTop: 'var(--space-4)',
                        color: 'var(--text-muted)',
                        fontSize: 'var(--font-size-sm)'
                    }}>
                        Press if you need immediate help
                    </p>
                </div>
            </div>
        </div>
    )
}

export default PatientHome
