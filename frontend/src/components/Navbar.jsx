import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Home, User, Users, LogOut, Scan } from 'lucide-react'

function Navbar() {
    const { user, profile, signOut } = useAuth()
    const navigate = useNavigate()

    const handleLogout = async () => {
        try {
            await signOut()
            localStorage.removeItem('token')
            navigate('/login')
        } catch (err) {
            console.error('Logout error:', err)
        }
    }

    // Determine role: use profile if available, otherwise check for user in auth state
    const role = profile?.role

    return (
        <nav className="nav">
            <div className="container flex items-center justify-between">
                <Link to="/" className="nav-brand">
                    <span style={{ fontSize: '2rem' }}>🧠</span>
                    ARKA
                </Link>

                <ul className="nav-links">
                    {!user ? (
                        <>
                            <li>
                                <Link to="/" className="nav-link">Home</Link>
                            </li>
                            <li>
                                <Link to="/login" className="btn btn-primary">
                                    Get Started
                                </Link>
                            </li>
                        </>
                    ) : role === 'patient' ? (
                        <>
                            <li>
                                <Link to="/patient" className="nav-link flex items-center gap-2">
                                    <Home size={18} />
                                    Home
                                </Link>
                            </li>
                            <li>
                                <Link to="/patient/recognize" className="nav-link flex items-center gap-2">
                                    <User size={18} />
                                    Faces
                                </Link>
                            </li>
                            <li>
                                <Link to="/patient/objects" className="nav-link flex items-center gap-2">
                                    <Scan size={18} />
                                    Objects
                                </Link>
                            </li>
                            <li>
                                <button onClick={handleLogout} className="nav-link flex items-center gap-2">
                                    <LogOut size={18} />
                                    Logout
                                </button>
                            </li>
                        </>
                    ) : role === 'caretaker' ? (
                        <>
                            <li>
                                <Link to="/dashboard" className="nav-link flex items-center gap-2">
                                    <Home size={18} />
                                    Dashboard
                                </Link>
                            </li>
                            <li>
                                <Link to="/dashboard/people" className="nav-link flex items-center gap-2">
                                    <Users size={18} />
                                    People
                                </Link>
                            </li>
                            <li>
                                <button onClick={handleLogout} className="nav-link flex items-center gap-2">
                                    <LogOut size={18} />
                                    Logout
                                </button>
                            </li>
                        </>
                    ) : (
                        // Profile still loading - show minimal menu
                        <li>
                            <button onClick={handleLogout} className="nav-link flex items-center gap-2">
                                <LogOut size={18} />
                                Logout
                            </button>
                        </li>
                    )}
                </ul>
            </div>
        </nav>
    )
}

export default Navbar

