import { useState, useRef, useEffect } from 'react'
import { api } from '../services/api'
import { Camera, RefreshCw, Volume2, User, AlertCircle } from 'lucide-react'

function Recognize() {
    const [status, setStatus] = useState('idle')
    const [result, setResult] = useState(null)
    const [error, setError] = useState(null)
    const [cameraReady, setCameraReady] = useState(false)

    const videoRef = useRef(null)
    const streamRef = useRef(null)
    const audioRef = useRef(null)

    useEffect(() => {
        startCamera()
        return () => stopCamera()
    }, [])

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: 640, height: 480 }
            })

            if (videoRef.current) {
                videoRef.current.srcObject = stream
                streamRef.current = stream
                setCameraReady(true)
            }
        } catch (err) {
            console.error('Camera error:', err)
            setError('Could not access camera. Please check permissions.')
        }
    }

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop())
        }
    }

    const captureAndRecognize = async () => {
        if (!videoRef.current || !cameraReady) return

        setStatus('capturing')
        setResult(null)
        setError(null)

        try {
            const canvas = document.createElement('canvas')
            canvas.width = videoRef.current.videoWidth
            canvas.height = videoRef.current.videoHeight

            const ctx = canvas.getContext('2d')
            ctx.drawImage(videoRef.current, 0, 0)

            const blob = await new Promise(resolve => {
                canvas.toBlob(resolve, 'image/jpeg', 0.9)
            })

            setStatus('recognizing')

            const response = await api.recognize.identify(blob)

            if (response.status === 'success') {
                setResult({
                    name: response.name,
                    confidence: response.confidence,
                    audioUrl: response.audio_url
                })
                setStatus('success')

                if (response.audio_url && audioRef.current) {
                    audioRef.current.src = response.audio_url
                    audioRef.current.play().catch(e => console.log('Audio autoplay blocked'))
                }
            } else {
                setStatus('not-found')
            }
        } catch (err) {
            console.error('Recognition error:', err)
            setError(err.message || 'Recognition failed. Please try again.')
            setStatus('error')
        }
    }

    const reset = () => {
        setStatus('idle')
        setResult(null)
        setError(null)
        if (audioRef.current) {
            audioRef.current.pause()
            audioRef.current.src = ''
        }
    }

    const playAudio = () => {
        if (audioRef.current && result?.audioUrl) {
            audioRef.current.play()
        }
    }

    return (
        <div className="page">
            <div className="container" style={{ maxWidth: '700px' }}>
                <div className="page-header">
                    <h1 className="page-title">Who Is This?</h1>
                    <p className="page-subtitle">Point your camera at someone to recognize them</p>
                </div>

                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div className="camera-container">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="camera-video"
                        />

                        {status === 'idle' && cameraReady && (
                            <div className="camera-overlay">
                                <div className="face-circle" />
                            </div>
                        )}

                        {(status === 'capturing' || status === 'recognizing') && (
                            <div className="camera-overlay" style={{ background: 'rgba(0,0,0,0.5)' }}>
                                <div style={{ textAlign: 'center', color: 'white' }}>
                                    <div className="spinner" style={{ margin: '0 auto var(--space-4)', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} />
                                    <p style={{ fontSize: 'var(--font-size-lg)' }}>
                                        {status === 'capturing' ? 'Capturing...' : 'Recognizing...'}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div style={{ padding: 'var(--space-6)' }}>
                        {status === 'idle' && (
                            <button
                                onClick={captureAndRecognize}
                                disabled={!cameraReady}
                                className="btn btn-primary btn-lg"
                                style={{ width: '100%' }}
                            >
                                <Camera size={24} />
                                Recognize Face
                            </button>
                        )}

                        {status === 'success' && result && (
                            <div className="animate-fade-in" style={{ textAlign: 'center' }}>
                                <div style={{
                                    display: 'inline-flex',
                                    padding: 'var(--space-4)',
                                    background: 'var(--bg-tertiary)',
                                    borderRadius: 'var(--radius-full)',
                                    marginBottom: 'var(--space-4)'
                                }}>
                                    <User size={48} style={{ color: 'var(--color-primary)' }} />
                                </div>

                                <h2 style={{
                                    fontSize: 'var(--font-size-2xl)',
                                    marginBottom: 'var(--space-2)',
                                    color: 'var(--color-primary)'
                                }}>
                                    {result.name}
                                </h2>

                                <div className="badge badge-success" style={{ marginBottom: 'var(--space-4)' }}>
                                    {result.confidence}% Match
                                </div>

                                <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
                                    {result.audioUrl && (
                                        <button onClick={playAudio} className="btn btn-secondary">
                                            <Volume2 size={20} />
                                            Play Memory
                                        </button>
                                    )}
                                    <button onClick={reset} className="btn btn-primary">
                                        <RefreshCw size={20} />
                                        Try Again
                                    </button>
                                </div>
                            </div>
                        )}

                        {status === 'not-found' && (
                            <div className="animate-fade-in" style={{ textAlign: 'center' }}>
                                <div style={{
                                    display: 'inline-flex',
                                    padding: 'var(--space-4)',
                                    background: 'rgba(245, 158, 11, 0.1)',
                                    borderRadius: 'var(--radius-full)',
                                    marginBottom: 'var(--space-4)'
                                }}>
                                    <AlertCircle size={48} style={{ color: 'var(--color-warning)' }} />
                                </div>

                                <h2 style={{ fontSize: 'var(--font-size-xl)', marginBottom: 'var(--space-2)' }}>
                                    Person Not Recognized
                                </h2>
                                <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
                                    This person is not in your memory album yet.
                                </p>

                                <button onClick={reset} className="btn btn-primary">
                                    <RefreshCw size={20} />
                                    Try Again
                                </button>
                            </div>
                        )}

                        {status === 'error' && (
                            <div className="animate-fade-in" style={{ textAlign: 'center' }}>
                                <div style={{
                                    padding: 'var(--space-4)',
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    borderRadius: 'var(--radius-md)',
                                    color: 'var(--color-error)',
                                    marginBottom: 'var(--space-4)'
                                }}>
                                    {error}
                                </div>
                                <button onClick={reset} className="btn btn-primary">
                                    <RefreshCw size={20} />
                                    Try Again
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <audio ref={audioRef} style={{ display: 'none' }} />
            </div>
        </div>
    )
}

export default Recognize
