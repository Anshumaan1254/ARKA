import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import {
    LayoutDashboard,
    Brain,
    MapPin,
    Pill,
    GraduationCap,
    Bell,
    Settings,
    Heart,
    Shield,
    Users
} from 'lucide-react'
import Dashboard from './pages/Dashboard'
import CognitiveHealth from './pages/CognitiveHealth'
import LocationTracker from './pages/LocationTracker'
import MedicationTracker from './pages/MedicationTracker'
import MemoryTraining from './pages/MemoryTraining'

function App() {
    return (
        <BrowserRouter>
            <div className="dashboard-layout">
                {/* Sidebar */}
                <aside className="sidebar">
                    <div className="sidebar-logo">
                        <div className="logo-icon">
                            <Heart size={24} color="white" />
                        </div>
                        <h1>ARKA</h1>
                    </div>

                    <nav>
                        <div className="nav-section">
                            <span className="nav-section-title">Overview</span>
                            <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                                <LayoutDashboard size={20} />
                                Dashboard
                            </NavLink>
                        </div>

                        <div className="nav-section">
                            <span className="nav-section-title">Health Monitoring</span>
                            <NavLink to="/cognitive" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                                <Brain size={20} />
                                Cognitive Health
                            </NavLink>
                            <NavLink to="/location" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                                <MapPin size={20} />
                                Location Tracker
                            </NavLink>
                            <NavLink to="/medication" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                                <Pill size={20} />
                                Medication
                            </NavLink>
                        </div>

                        <div className="nav-section">
                            <span className="nav-section-title">Activities</span>
                            <NavLink to="/training" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                                <GraduationCap size={20} />
                                Memory Training
                            </NavLink>
                        </div>

                        <div className="nav-section">
                            <span className="nav-section-title">System</span>
                            <NavLink to="/alerts" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                                <Bell size={20} />
                                Alerts
                            </NavLink>
                            <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                                <Settings size={20} />
                                Settings
                            </NavLink>
                        </div>
                    </nav>

                    <div style={{ marginTop: 'auto', padding: '1rem' }}>
                        <div className="patient-status">
                            <div className="patient-avatar">M</div>
                            <div className="patient-info">
                                <h3>Patient</h3>
                                <div className="status-badge safe">
                                    <span className="pulse"></span>
                                    Safe at Home
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="main-content">
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/cognitive" element={<CognitiveHealth />} />
                        <Route path="/location" element={<LocationTracker />} />
                        <Route path="/medication" element={<MedicationTracker />} />
                        <Route path="/training" element={<MemoryTraining />} />
                    </Routes>
                </main>
            </div>
        </BrowserRouter>
    )
}

export default App
