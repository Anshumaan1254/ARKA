import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Camera, Scan, Volume2, X, Loader } from 'lucide-react'

function ObjectRecognize() {
    const { token } = useAuth()
    const [detecting, setDetecting] = useState(false)
    const [results, setResults] = useState([])
    const [error, setError] = useState('')
    const [cameraActive, setCameraActive] = useState(false)
    const [capturedImage, setCapturedImage] = useState(null)

    const videoRef = useRef(null)
    const canvasRef = useRef(null)
    const streamRef = useRef(null)

    useEffect(() => {
        return () => {
            // Cleanup camera on unmount
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop())
            }
        }
    }, [])

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: 640, height: 480 }
            })
            streamRef.current = stream
            if (videoRef.current) {
                videoRef.current.srcObject = stream
            }
            setCameraActive(true)
            setResults([])
            setCapturedImage(null)
            setError('')
        } catch (err) {
            console.error('Camera error:', err)
            setError('Could not access camera. Please allow camera permissions.')
        }
    }

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop())
        }
        setCameraActive(false)
    }

    const captureAndDetect = async () => {
        if (!videoRef.current || !canvasRef.current) return

        const video = videoRef.current
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')

        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        ctx.drawImage(video, 0, 0)

        // Convert to blob
        canvas.toBlob(async (blob) => {
            if (!blob) return

            setCapturedImage(canvas.toDataURL('image/jpeg'))
            setDetecting(true)
            setError('')
            stopCamera()

            try {
                const formData = new FormData()
                formData.append('file', blob, 'capture.jpg')

                const response = await fetch('/api/ml/detect-objects', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData
                })

                const data = await response.json()

                if (data.success && data.objects) {
                    setResults(data.objects)
                    // Speak the results
                    speakResults(data.objects)
                } else {
                    setError(data.error || 'No objects detected')
                }
            } catch (err) {
                console.error('Detection error:', err)
                setError('Failed to detect objects. Please try again.')
            } finally {
                setDetecting(false)
            }
        }, 'image/jpeg', 0.9)
    }

    const speakResults = (objects) => {
        if (objects.length === 0) {
            speak("I couldn't detect any objects in the image.")
            return
        }

        const descriptions = objects.map(obj => {
            if (obj.custom_description) {
                return obj.custom_description
            }
            return `${obj.label} with ${Math.round(obj.confidence * 100)}% confidence`
        })

        const message = `I can see: ${descriptions.join(', ')}`
        speak(message)
    }

    const speak = (text) => {
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.rate = 0.9
        utterance.pitch = 1
        speechSynthesis.speak(utterance)
    }

    const reset = () => {
        setResults([])
        setCapturedImage(null)
        setError('')
    }

    return (
        <div className="page">
            <div className="container" style={{ maxWidth: '600px' }}>
                <div className="page-header">
                    <h1 className="page-title">Object Recognition</h1>
                    <p className="page-subtitle">Point your camera at objects to identify them</p>
                </div>

                <div className="card" style={{ overflow: 'hidden' }}>
                    {/* Camera/Image View */}
                    <div style={{
                        position: 'relative',
                        aspectRatio: '4/3',
                        background: 'var(--bg-tertiary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        {cameraActive ? (
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        ) : capturedImage ? (
                            <img
                                src={capturedImage}
                                alt="Captured"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        ) : (
                            <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                                <Scan size={64} style={{ marginBottom: 'var(--space-4)', opacity: 0.5 }} />
                                <p>Tap "Start Camera" to begin</p>
                            </div>
                        )}

                        {detecting && (
                            <div style={{
                                position: 'absolute',
                                inset: 0,
                                background: 'rgba(0,0,0,0.7)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white'
                            }}>
                                <Loader size={48} className="spin" style={{ marginBottom: 'var(--space-3)' }} />
                                <p>Analyzing objects...</p>
                            </div>
                        )}
                    </div>

                    <canvas ref={canvasRef} style={{ display: 'none' }} />

                    {/* Controls */}
                    <div style={{ padding: 'var(--space-4)' }}>
                        {error && (
                            <div style={{
                                padding: 'var(--space-3)',
                                background: 'rgba(239, 68, 68, 0.1)',
                                color: 'var(--color-error)',
                                borderRadius: 'var(--radius-md)',
                                marginBottom: 'var(--space-4)',
                                fontSize: 'var(--font-size-sm)'
                            }}>
                                {error}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                            {!cameraActive && !capturedImage && (
                                <button
                                    onClick={startCamera}
                                    className="btn btn-primary"
                                    style={{ flex: 1 }}
                                >
                                    <Camera size={20} />
                                    Start Camera
                                </button>
                            )}

                            {cameraActive && (
                                <>
                                    <button
                                        onClick={captureAndDetect}
                                        className="btn btn-primary"
                                        style={{ flex: 1 }}
                                        disabled={detecting}
                                    >
                                        <Scan size={20} />
                                        Detect Objects
                                    </button>
                                    <button
                                        onClick={stopCamera}
                                        className="btn btn-secondary"
                                    >
                                        <X size={20} />
                                    </button>
                                </>
                            )}

                            {capturedImage && !detecting && (
                                <button
                                    onClick={reset}
                                    className="btn btn-secondary"
                                    style={{ flex: 1 }}
                                >
                                    <Camera size={20} />
                                    Scan Again
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Results */}
                {results.length > 0 && (
                    <div className="card" style={{ marginTop: 'var(--space-4)' }}>
                        <h3 style={{ marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                            <Scan size={20} style={{ color: 'var(--color-primary)' }} />
                            Detected Objects ({results.length})
                        </h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                            {results.map((obj, index) => (
                                <div
                                    key={index}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: 'var(--space-3)',
                                        background: 'var(--bg-secondary)',
                                        borderRadius: 'var(--radius-md)'
                                    }}
                                >
                                    <div>
                                        <p style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                                            {obj.label}
                                        </p>
                                        {obj.custom_description && (
                                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-primary)' }}>
                                                {obj.custom_description}
                                            </p>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                        <span className="badge badge-success">
                                            {Math.round(obj.confidence * 100)}%
                                        </span>
                                        <button
                                            onClick={() => speak(obj.custom_description || obj.label)}
                                            className="btn btn-secondary"
                                            style={{ padding: 'var(--space-2)' }}
                                            title="Read aloud"
                                        >
                                            <Volume2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Tips */}
                <div className="card" style={{ marginTop: 'var(--space-4)', background: 'var(--bg-tertiary)' }}>
                    <h4 style={{ marginBottom: 'var(--space-2)' }}>💡 Tips</h4>
                    <ul style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', paddingLeft: 'var(--space-4)' }}>
                        <li>Hold the camera steady for better results</li>
                        <li>Ensure good lighting on the object</li>
                        <li>Point directly at the object you want to identify</li>
                        <li>Your caretaker can add custom descriptions for your personal items</li>
                    </ul>
                </div>
            </div>
        </div>
    )
}

export default ObjectRecognize
