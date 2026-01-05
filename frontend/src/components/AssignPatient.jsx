import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { UserPlus, Search, Check, X, Users } from 'lucide-react'

function AssignPatient({ onClose, onAssigned }) {
    const { supabase } = useAuth()
    const [searchEmail, setSearchEmail] = useState('')
    const [searchResults, setSearchResults] = useState([])
    const [searching, setSearching] = useState(false)
    const [assigning, setAssigning] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    const searchPatients = async () => {
        if (!searchEmail.trim()) return

        setSearching(true)
        setError('')
        setSearchResults([])

        try {
            // Search for patients by email (partial match)
            const { data, error: searchError } = await supabase
                .from('profiles')
                .select('id, full_name, role')
                .eq('role', 'patient')
                .ilike('full_name', `%${searchEmail}%`)
                .is('caretaker_id', null)  // Only unassigned patients
                .limit(10)

            if (searchError) throw searchError

            setSearchResults(data || [])
            if (data.length === 0) {
                setError('No unassigned patients found with that name')
            }
        } catch (err) {
            console.error('Search error:', err)
            setError('Failed to search patients')
        } finally {
            setSearching(false)
        }
    }

    const assignPatient = async (patientId) => {
        setAssigning(true)
        setError('')

        try {
            const { data: { user } } = await supabase.auth.getUser()

            const { error: updateError } = await supabase
                .from('profiles')
                .update({ caretaker_id: user.id })
                .eq('id', patientId)

            if (updateError) throw updateError

            setSuccess('Patient assigned successfully!')
            setTimeout(() => {
                onAssigned && onAssigned()
                onClose && onClose()
            }, 1500)

        } catch (err) {
            console.error('Assign error:', err)
            setError('Failed to assign patient')
        } finally {
            setAssigning(false)
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
                maxHeight: '80vh',
                overflow: 'auto'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 'var(--space-6)'
                }}>
                    <h2 style={{ fontSize: 'var(--font-size-xl)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <UserPlus size={24} style={{ color: 'var(--color-primary)' }} />
                        Assign Patient
                    </h2>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', color: 'var(--text-muted)' }}
                    >
                        <X size={24} />
                    </button>
                </div>

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

                {success && (
                    <div style={{
                        padding: 'var(--space-3)',
                        background: 'rgba(34, 197, 94, 0.1)',
                        color: 'var(--color-success)',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: 'var(--space-4)',
                        fontSize: 'var(--font-size-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-2)'
                    }}>
                        <Check size={18} />
                        {success}
                    </div>
                )}

                <div style={{ marginBottom: 'var(--space-4)' }}>
                    <label className="input-label">Search Patient by Name</label>
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        <input
                            type="text"
                            value={searchEmail}
                            onChange={(e) => setSearchEmail(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && searchPatients()}
                            className="input"
                            placeholder="Enter patient's name..."
                            style={{ flex: 1 }}
                        />
                        <button
                            onClick={searchPatients}
                            className="btn btn-primary"
                            disabled={searching || !searchEmail.trim()}
                        >
                            {searching ? (
                                <span className="spinner" style={{ width: '20px', height: '20px' }} />
                            ) : (
                                <Search size={20} />
                            )}
                        </button>
                    </div>
                </div>

                {searchResults.length > 0 && (
                    <div>
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>
                            Found {searchResults.length} patient(s):
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                            {searchResults.map(patient => (
                                <div
                                    key={patient.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: 'var(--space-3)',
                                        background: 'var(--bg-secondary)',
                                        borderRadius: 'var(--radius-md)'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                        <div style={{
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: 'var(--radius-full)',
                                            background: 'var(--bg-tertiary)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <Users size={20} style={{ color: 'var(--color-primary)' }} />
                                        </div>
                                        <div>
                                            <p style={{ fontWeight: 500 }}>{patient.full_name}</p>
                                            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                                                Patient
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => assignPatient(patient.id)}
                                        className="btn btn-primary"
                                        style={{ padding: 'var(--space-2) var(--space-3)' }}
                                        disabled={assigning}
                                    >
                                        {assigning ? (
                                            <span className="spinner" style={{ width: '16px', height: '16px' }} />
                                        ) : (
                                            <>
                                                <Check size={16} />
                                                Assign
                                            </>
                                        )}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div style={{
                    marginTop: 'var(--space-6)',
                    padding: 'var(--space-4)',
                    background: 'var(--bg-tertiary)',
                    borderRadius: 'var(--radius-md)'
                }}>
                    <h4 style={{ marginBottom: 'var(--space-2)', fontSize: 'var(--font-size-sm)' }}>
                        💡 How it works
                    </h4>
                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                        Search for a patient by their name. Only patients who haven't been assigned to a caretaker yet will appear.
                        Once assigned, you'll be able to manage their known faces and voice memories.
                    </p>
                </div>
            </div>
        </div>
    )
}

export default AssignPatient
