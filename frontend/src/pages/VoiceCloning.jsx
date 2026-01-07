import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Mic, Play, Square, Upload, Volume2, Loader, Users, Sparkles, CheckCircle } from 'lucide-react'

const styles = {
    page: {
        minHeight: '100vh',
        background: 'linear-gradient(145deg, #dbeafe 0%, #bfdbfe 50%, #93c5fd 100%)',
        paddingTop: '2rem',
        paddingBottom: '4rem'
    },
    container: {
        maxWidth: '800px',
        margin: '0 auto',
        padding: '0 1.5rem'
    },
    header: {
        textAlign: 'center',
        marginBottom: '2rem'
    },
    headerIcon: {
        width: '90px',
        height: '90px',
        background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
        borderRadius: '28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 1.5rem',
        boxShadow: '0 12px 40px rgba(59, 130, 246, 0.35)'
    },
    title: {
        fontSize: '2.25rem',
        fontWeight: '800',
        background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        marginBottom: '0.5rem'
    },
    subtitle: {
        color: '#64748b',
        fontSize: '1.1rem',
        maxWidth: '500px',
        margin: '0 auto'
    },
    card: {
        background: 'white',
        borderRadius: '24px',
        padding: '2rem',
        boxShadow: '0 4px 25px rgba(0, 0, 0, 0.08)',
        marginBottom: '1.5rem'
    },
    cardTitle: {
        fontSize: '1.25rem',
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: '0.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
    },
    personSelect: {
        width: '100%',
        padding: '1rem',
        border: '2px solid #e2e8f0',
        borderRadius: '14px',
        fontSize: '1rem',
        background: '#f8fafc'
    },
    recordSection: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '2rem'
    },
    recordButton: (isRecording) => ({
        width: '120px',
        height: '120px',
        borderRadius: '50%',
        border: 'none',
        background: isRecording
            ? 'linear-gradient(135deg, #ef4444, #dc2626)'
            : 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
        color: 'white',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: isRecording
            ? '0 8px 30px rgba(239, 68, 68, 0.4)'
            : '0 8px 30px rgba(59, 130, 246, 0.4)',
        transition: 'all 0.3s ease'
    }),
    timer: {
        fontSize: '2rem',
        fontWeight: '700',
        color: '#1e293b',
        marginTop: '1rem'
    },
    uploadButton: {
        background: 'linear-gradient(135deg, #10b981, #059669)',
        border: 'none',
        color: 'white',
        padding: '1rem 2rem',
        borderRadius: '14px',
        fontSize: '1rem',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        margin: '1.5rem auto 0'
    },
    testSection: {
        marginTop: '1.5rem',
        padding: '1.5rem',
        background: '#f8fafc',
        borderRadius: '16px'
    },
    textInput: {
        width: '100%',
        padding: '1rem',
        border: '2px solid #e2e8f0',
        borderRadius: '14px',
        fontSize: '1rem',
        background: 'white',
        resize: 'vertical',
        minHeight: '80px',
        marginBottom: '1rem'
    },
    speakButton: {
        background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
        border: 'none',
        color: 'white',
        padding: '1rem 2rem',
        borderRadius: '14px',
        fontSize: '1rem',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        width: '100%',
        justifyContent: 'center'
    },
    featureStatus: (available) => ({
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.75rem 1rem',
        background: available ? '#d1fae5' : '#fef3c7',
        color: available ? '#059669' : '#92400e',
        borderRadius: '12px',
        fontSize: '0.9rem',
        fontWeight: '600',
        marginBottom: '1rem'
    }),
    infoBox: {
        background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)',
        borderRadius: '16px',
        padding: '1.25rem',
        marginTop: '1rem'
    }
}

function VoiceCloning() {
    const { token, profile } = useAuth()
    const [people, setPeople] = useState([])
    const [selectedPerson, setSelectedPerson] = useState('')
    const [features, setFeatures] = useState(null)
    const [loading, setLoading] = useState(true)

    // Recording state
    const [isRecording, setIsRecording] = useState(false)
    const [recordingTime, setRecordingTime] = useState(0)
    const [audioBlob, setAudioBlob] = useState(null)
    const [audioUrl, setAudioUrl] = useState(null)
    const mediaRecorderRef = useRef(null)
    const chunksRef = useRef([])
    const timerRef = useRef(null)

    // Upload/Test state
    const [uploading, setUploading] = useState(false)
    const [uploadSuccess, setUploadSuccess] = useState(false)
    const [testText, setTestText] = useState("Hello! I love you and I'm thinking of you.")
    const [speaking, setSpeaking] = useState(false)

    useEffect(() => {
        fetchData()
    }, [token])

    const fetchData = async () => {
        if (!token) return
        try {
            const [peopleRes, featuresRes] = await Promise.all([
                fetch('/api/people', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/ml/features', { headers: { 'Authorization': `Bearer ${token}` } })
            ])

            const peopleData = await peopleRes.json()
            const featuresData = await featuresRes.json()

            setPeople(peopleData.people || [])
            setFeatures(featuresData)

            if (peopleData.people?.length > 0) {
                setSelectedPerson(peopleData.people[0].id)
            }
        } catch (e) {
            console.error('Failed to fetch:', e)
        } finally {
            setLoading(false)
        }
    }

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            mediaRecorderRef.current = new MediaRecorder(stream)
            chunksRef.current = []

            mediaRecorderRef.current.ondataavailable = (e) => {
                chunksRef.current.push(e.data)
            }

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
                setAudioBlob(blob)
                setAudioUrl(URL.createObjectURL(blob))
                stream.getTracks().forEach(t => t.stop())
            }

            mediaRecorderRef.current.start()
            setIsRecording(true)
            setRecordingTime(0)

            timerRef.current = setInterval(() => {
                setRecordingTime(t => t + 1)
            }, 1000)
        } catch (e) {
            alert('Could not access microphone. Please allow microphone access.')
        }
    }

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop()
            setIsRecording(false)
            clearInterval(timerRef.current)
        }
    }

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const uploadVoiceSample = async () => {
        if (!audioBlob || !selectedPerson) return

        setUploading(true)
        try {
            const formData = new FormData()
            formData.append('file', audioBlob, 'voice_sample.webm')
            formData.append('person_id', selectedPerson)
            formData.append('patient_id', profile.id)
            formData.append('created_by', profile.id)

            const res = await fetch('/api/ml/upload-voice-sample', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            })

            const data = await res.json()
            if (data.success) {
                setUploadSuccess(true)
                setTimeout(() => setUploadSuccess(false), 3000)
            }
        } catch (e) {
            console.error('Upload failed:', e)
        } finally {
            setUploading(false)
        }
    }

    const testSpeak = async () => {
        if (!testText.trim() || !selectedPerson) return

        setSpeaking(true)
        try {
            const res = await fetch('/api/ml/speak', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: testText,
                    person_id: selectedPerson,
                    patient_id: profile.id
                })
            })

            const data = await res.json()

            // If we get audio back, play it
            if (data.audio_base64) {
                const audio = new Audio(`data:audio/wav;base64,${data.audio_base64}`)
                audio.play()
            } else {
                // Fallback to browser TTS
                const utterance = new SpeechSynthesisUtterance(testText)
                speechSynthesis.speak(utterance)
            }
        } catch (e) {
            // Fallback to browser TTS
            const utterance = new SpeechSynthesisUtterance(testText)
            speechSynthesis.speak(utterance)
        } finally {
            setSpeaking(false)
        }
    }

    const selectedPersonName = people.find(p => p.id === selectedPerson)?.name || 'family member'

    if (loading) {
        return (
            <div style={{ ...styles.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader size={48} color="#3b82f6" className="spin" />
            </div>
        )
    }

    return (
        <div style={styles.page}>
            <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

            <div style={styles.container}>
                <div style={styles.header}>
                    <div style={styles.headerIcon}>
                        <Volume2 size={42} color="white" />
                    </div>
                    <h1 style={styles.title}>Family Voice</h1>
                    <p style={styles.subtitle}>
                        Clone family voices to speak greetings and messages to your loved one
                    </p>
                </div>

                {/* Feature Status */}
                <div style={styles.featureStatus(features?.voice_cloning)}>
                    {features?.voice_cloning ? (
                        <>
                            <CheckCircle size={18} />
                            Voice Cloning Model Ready (Coqui XTTS)
                        </>
                    ) : (
                        <>
                            <Volume2 size={18} />
                            Using Browser Text-to-Speech (works great!)
                        </>
                    )}
                </div>

                {/* Person Selection */}
                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>
                        <Users size={22} color="#3b82f6" />
                        Select Family Member
                    </h3>
                    <p style={{ color: '#64748b', marginBottom: '1rem' }}>
                        Choose whose voice you want to clone or test
                    </p>
                    <select
                        style={styles.personSelect}
                        value={selectedPerson}
                        onChange={(e) => setSelectedPerson(e.target.value)}
                    >
                        {people.length === 0 ? (
                            <option value="">No people added yet</option>
                        ) : (
                            people.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.name} ({p.relationship})
                                </option>
                            ))
                        )}
                    </select>
                </div>

                {/* Record Voice */}
                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>
                        <Mic size={22} color="#3b82f6" />
                        Record Voice Sample
                    </h3>
                    <p style={{ color: '#64748b', marginBottom: '1rem' }}>
                        Record 30-60 seconds of {selectedPersonName} speaking naturally
                    </p>

                    <div style={styles.recordSection}>
                        <button
                            style={styles.recordButton(isRecording)}
                            onClick={isRecording ? stopRecording : startRecording}
                        >
                            {isRecording ? <Square size={48} /> : <Mic size={48} />}
                        </button>

                        <div style={styles.timer}>
                            {formatTime(recordingTime)}
                        </div>

                        <p style={{ color: '#64748b', marginTop: '0.5rem' }}>
                            {isRecording ? 'Recording... Click to stop' : 'Click to start recording'}
                        </p>
                    </div>

                    {audioUrl && (
                        <div style={{ marginTop: '1rem' }}>
                            <audio controls src={audioUrl} style={{ width: '100%' }} />

                            <button
                                style={styles.uploadButton}
                                onClick={uploadVoiceSample}
                                disabled={uploading || uploadSuccess}
                            >
                                {uploading ? (
                                    <><Loader size={20} className="spin" /> Uploading...</>
                                ) : uploadSuccess ? (
                                    <><CheckCircle size={20} /> Uploaded!</>
                                ) : (
                                    <><Upload size={20} /> Upload Voice Sample</>
                                )}
                            </button>
                        </div>
                    )}
                </div>

                {/* Test Voice */}
                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>
                        <Play size={22} color="#8b5cf6" />
                        Test Voice
                    </h3>
                    <p style={{ color: '#64748b', marginBottom: '1rem' }}>
                        Type a message to hear in {selectedPersonName}'s voice
                    </p>

                    <textarea
                        style={styles.textInput}
                        value={testText}
                        onChange={(e) => setTestText(e.target.value)}
                        placeholder="Enter text to speak..."
                    />

                    <button
                        style={styles.speakButton}
                        onClick={testSpeak}
                        disabled={speaking || !testText.trim()}
                    >
                        {speaking ? (
                            <><Loader size={20} className="spin" /> Speaking...</>
                        ) : (
                            <><Volume2 size={20} /> Speak with {selectedPersonName}'s Voice</>
                        )}
                    </button>
                </div>

                {/* Info */}
                <div style={styles.infoBox}>
                    <h4 style={{ margin: '0 0 0.5rem', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Sparkles size={18} />
                        How Voice Cloning Works
                    </h4>
                    <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#1e3a8a', fontSize: '0.9rem', lineHeight: 1.7 }}>
                        <li>Record 30-60 seconds of clear speech</li>
                        <li>Our AI learns the voice patterns</li>
                        <li>Generate personalized greetings in their voice</li>
                        <li>Helps patients feel connected to loved ones</li>
                    </ul>
                </div>
            </div>
        </div>
    )
}

export default VoiceCloning
