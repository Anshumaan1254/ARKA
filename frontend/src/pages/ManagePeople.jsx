import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../hooks/useAuth'
import { api } from '../services/api'
import { Plus, Trash2, Upload, User, Mic, MicOff, X, Save } from 'lucide-react'

function ManagePeople() {
    const { profile, supabase } = useAuth()
    const [people, setPeople] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [selectedPerson, setSelectedPerson] = useState(null)

    useEffect(() => {
        loadPeople()
    }, [])

    const loadPeople = async () => {
        try {
            const response = await api.people.list()
            setPeople(response.people || [])
        } catch (err) {
            console.error('Load people error:', err)
        } finally {
            setLoading(false)
        }
    }

    const deletePerson = async (id) => {
        if (!confirm('Are you sure you want to delete this person?')) return

        try {
            await api.people.delete(id)
            setPeople(people.filter(p => p.id !== id))
        } catch (err) {
            console.error('Delete error:', err)
            alert('Failed to delete person')
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
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 'var(--space-6)'
                }}>
                    <div>
                        <h1 className="page-title" style={{ marginBottom: 'var(--space-1)' }}>
                            Manage People
                        </h1>
                        <p className="page-subtitle">Add and manage known faces for your patients</p>
                    </div>

                    <button
                        onClick={() => {
                            setSelectedPerson(null)
                            setShowModal(true)
                        }}
                        className="btn btn-primary"
                    >
                        <Plus size={20} />
                        Add Person
                    </button>
                </div>

                {people.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
                        <div style={{
                            display: 'inline-flex',
                            padding: 'var(--space-5)',
                            background: 'var(--bg-tertiary)',
                            borderRadius: 'var(--radius-full)',
                            marginBottom: 'var(--space-4)'
                        }}>
                            <User size={48} style={{ color: 'var(--color-primary)' }} />
                        </div>
                        <h3 style={{ marginBottom: 'var(--space-2)' }}>No People Added Yet</h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
                            Start by adding the faces of people your patient knows.
                        </p>
                        <button
                            onClick={() => setShowModal(true)}
                            className="btn btn-primary"
                        >
                            <Plus size={20} />
                            Add First Person
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-3">
                        {people.map(person => (
                            <PersonCard
                                key={person.id}
                                person={person}
                                onEdit={() => {
                                    setSelectedPerson(person)
                                    setShowModal(true)
                                }}
                                onDelete={() => deletePerson(person.id)}
                            />
                        ))}
                    </div>
                )}

                {showModal && (
                    <PersonModal
                        person={selectedPerson}
                        onClose={() => {
                            setShowModal(false)
                            setSelectedPerson(null)
                        }}
                        onSave={() => {
                            setShowModal(false)
                            setSelectedPerson(null)
                            loadPeople()
                        }}
                    />
                )}
            </div>
        </div>
    )
}

function PersonCard({ person, onEdit, onDelete }) {
    const memoryCount = person.voice_memories?.length || 0

    return (
        <div className="card" style={{ padding: 'var(--space-4)' }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                marginBottom: 'var(--space-3)'
            }}>
                <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--bg-tertiary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden'
                }}>
                    {person.image_path ? (
                        <img
                            src={`/api/upload/download-url?bucket=faces&path=${encodeURIComponent(person.image_path)}`}
                            alt={person.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => {
                                e.target.style.display = 'none'
                                e.target.parentNode.innerHTML = '<span style="font-size:1.5rem">👤</span>'
                            }}
                        />
                    ) : (
                        <User size={24} style={{ color: 'var(--color-primary)' }} />
                    )}
                </div>

                <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: 'var(--font-size-lg)' }}>{person.name}</h3>
                    {person.relationship && (
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                            {person.relationship}
                        </p>
                    )}
                </div>
            </div>

            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: 'var(--space-3)',
                borderTop: '1px solid var(--border-light)'
            }}>
                <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>
                    {memoryCount} voice memor{memoryCount === 1 ? 'y' : 'ies'}
                </span>

                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <button
                        onClick={onEdit}
                        className="btn btn-secondary"
                        style={{ padding: 'var(--space-2)' }}
                        title="Edit"
                    >
                        <Upload size={16} />
                    </button>
                    <button
                        onClick={onDelete}
                        className="btn"
                        style={{
                            padding: 'var(--space-2)',
                            background: 'rgba(239, 68, 68, 0.1)',
                            color: 'var(--color-error)'
                        }}
                        title="Delete"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
        </div>
    )
}

function PersonModal({ person, onClose, onSave }) {
    const [formData, setFormData] = useState({
        name: person?.name || '',
        relationship: person?.relationship || '',
        notes: person?.notes || '',
        patient_id: ''
    })
    const [faceFile, setFaceFile] = useState(null)
    const [facePreview, setFacePreview] = useState(null)
    const [recording, setRecording] = useState(false)
    const [audioBlob, setAudioBlob] = useState(null)
    const [loading, setLoading] = useState(false)
    const [patients, setPatients] = useState([])

    const { supabase } = useAuth()
    const mediaRecorderRef = useRef(null)
    const audioChunksRef = useRef([])

    useEffect(() => {
        loadPatients()
    }, [])

    const loadPatients = async () => {
        try {
            const { data } = await supabase
                .from('profiles')
                .select('id, full_name')
                .eq('role', 'patient')

            if (data && data.length > 0) {
                setPatients(data)
                // Auto-select if only one patient
                if (data.length === 1) {
                    setFormData(prev => ({ ...prev, patient_id: data[0].id }))
                }
            } else {
                // No patients found - show helpful message
                setPatients([])
            }
        } catch (err) {
            console.error('Load patients error:', err)
        }
    }

    const handleFaceSelect = (e) => {
        const file = e.target.files[0]
        if (file) {
            setFaceFile(file)
            const reader = new FileReader()
            reader.onload = (e) => setFacePreview(e.target.result)
            reader.readAsDataURL(file)
        }
    }

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            mediaRecorderRef.current = new MediaRecorder(stream)
            audioChunksRef.current = []

            mediaRecorderRef.current.ondataavailable = (e) => {
                audioChunksRef.current.push(e.data)
            }

            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
                setAudioBlob(audioBlob)
                stream.getTracks().forEach(track => track.stop())
            }

            mediaRecorderRef.current.start()
            setRecording(true)
        } catch (err) {
            console.error('Recording error:', err)
            alert('Could not access microphone')
        }
    }

    const stopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop()
            setRecording(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!formData.name || (!person && !formData.patient_id)) {
            alert('Please fill in required fields')
            return
        }

        setLoading(true)

        try {
            let personId = person?.id

            if (!person) {
                const response = await api.people.create({
                    patient_id: formData.patient_id,
                    name: formData.name,
                    relationship: formData.relationship,
                    notes: formData.notes
                })
                personId = response.person.id
            } else {
                await api.people.update(person.id, {
                    name: formData.name,
                    relationship: formData.relationship,
                    notes: formData.notes
                })
            }

            if (faceFile && personId) {
                const mlFormData = new FormData()
                mlFormData.append('person_id', personId)
                mlFormData.append('patient_id', formData.patient_id || person.patient_id)
                mlFormData.append('file', faceFile)

                await fetch('/api/ml/register', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: mlFormData
                })
            }

            if (audioBlob && personId) {
                const voiceFormData = new FormData()
                voiceFormData.append('person_id', personId)
                voiceFormData.append('description', 'Voice memory')
                voiceFormData.append('is_primary', 'true')
                voiceFormData.append('file', audioBlob, 'memory.webm')

                await fetch('/api/ml/upload-voice', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: voiceFormData
                })
            }

            onSave()
        } catch (err) {
            console.error('Save error:', err)
            alert('Failed to save. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 'var(--space-4)'
        }}>
            <div className="card" style={{
                width: '100%',
                maxWidth: '500px',
                maxHeight: '90vh',
                overflow: 'auto'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 'var(--space-6)'
                }}>
                    <h2 style={{ fontSize: 'var(--font-size-xl)' }}>
                        {person ? 'Edit Person' : 'Add New Person'}
                    </h2>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', color: 'var(--text-muted)' }}
                    >
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    {!person && (
                        <div className="input-group" style={{ marginBottom: 'var(--space-4)' }}>
                            <label className="input-label">Patient *</label>
                            {patients.length === 0 ? (
                                <p style={{ color: 'var(--color-error)', fontSize: 'var(--font-size-sm)' }}>
                                    No patients found. Please create a patient account first, then link them to you as their caretaker.
                                </p>
                            ) : patients.length === 1 ? (
                                <input
                                    type="text"
                                    className="input"
                                    value={patients[0].full_name}
                                    disabled
                                    style={{ background: 'var(--bg-secondary)' }}
                                />
                            ) : (
                                <select
                                    value={formData.patient_id}
                                    onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
                                    className="input"
                                    required
                                >
                                    <option value="">Select patient...</option>
                                    {patients.map(p => (
                                        <option key={p.id} value={p.id}>{p.full_name}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    )}

                    <div className="input-group" style={{ marginBottom: 'var(--space-4)' }}>
                        <label className="input-label">Name *</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="input"
                            placeholder="e.g., John Smith"
                            required
                        />
                    </div>

                    <div className="input-group" style={{ marginBottom: 'var(--space-4)' }}>
                        <label className="input-label">Relationship</label>
                        <input
                            type="text"
                            value={formData.relationship}
                            onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                            className="input"
                            placeholder="e.g., Son, Doctor, Friend"
                        />
                    </div>

                    <div className="input-group" style={{ marginBottom: 'var(--space-4)' }}>
                        <label className="input-label">Face Photo</label>
                        <div style={{
                            border: '2px dashed var(--border-light)',
                            borderRadius: 'var(--radius-md)',
                            padding: 'var(--space-4)',
                            textAlign: 'center',
                            cursor: 'pointer'
                        }}
                            onClick={() => document.getElementById('face-input').click()}
                        >
                            {facePreview ? (
                                <img
                                    src={facePreview}
                                    alt="Preview"
                                    style={{
                                        maxWidth: '200px',
                                        maxHeight: '200px',
                                        borderRadius: 'var(--radius-md)'
                                    }}
                                />
                            ) : (
                                <>
                                    <Upload size={32} style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }} />
                                    <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                                        Click to upload a clear face photo
                                    </p>
                                </>
                            )}
                        </div>
                        <input
                            id="face-input"
                            type="file"
                            accept="image/*"
                            onChange={handleFaceSelect}
                            style={{ display: 'none' }}
                        />
                    </div>

                    <div className="input-group" style={{ marginBottom: 'var(--space-6)' }}>
                        <label className="input-label">Voice Memory</label>
                        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
                            <button
                                type="button"
                                onClick={recording ? stopRecording : startRecording}
                                className={`btn ${recording ? 'btn-danger' : 'btn-secondary'}`}
                            >
                                {recording ? <MicOff size={20} /> : <Mic size={20} />}
                                {recording ? 'Stop Recording' : 'Record Memory'}
                            </button>

                            {audioBlob && (
                                <audio
                                    src={URL.createObjectURL(audioBlob)}
                                    controls
                                    style={{ height: '40px' }}
                                />
                            )}
                        </div>
                        <p style={{
                            fontSize: 'var(--font-size-xs)',
                            color: 'var(--text-muted)',
                            marginTop: 'var(--space-2)'
                        }}>
                            Record a message about this person that will play when recognized
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn btn-secondary"
                            style={{ flex: 1 }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            style={{ flex: 1 }}
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="spinner" style={{ width: '20px', height: '20px' }} />
                            ) : (
                                <>
                                    <Save size={20} />
                                    Save
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default ManagePeople
