import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import Navbar from './components/Navbar'
import Landing from './pages/Landing'
import Login from './pages/Login'
import PatientHome from './pages/PatientHome'
import PatientMemories from './pages/PatientMemories'
import PatientReminders from './pages/PatientReminders'
import CaretakerDashboard from './pages/CaretakerDashboard'
import Recognize from './pages/Recognize'
import ObjectRecognize from './pages/ObjectRecognize'
import ManagePeople from './pages/ManagePeople'
import MemoryEvents from './pages/MemoryEvents'
import HealthMonitor from './pages/HealthMonitor'
import VoiceCloning from './pages/VoiceCloning'

function ProtectedRoute({ children, allowedRoles }) {
    const { user, profile, loading } = useAuth()

    if (loading) {
        return (
            <div className="page flex items-center justify-center">
                <div className="spinner" />
            </div>
        )
    }

    if (!user) {
        return <Navigate to="/login" replace />
    }

    if (allowedRoles && !allowedRoles.includes(profile?.role)) {
        return <Navigate to="/" replace />
    }

    return children
}

function AppRoutes() {
    const { user, profile } = useAuth()

    return (
        <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />

            {/* Patient Routes */}
            <Route path="/patient" element={
                <ProtectedRoute allowedRoles={['patient']}>
                    <PatientHome />
                </ProtectedRoute>
            } />

            <Route path="/patient/recognize" element={
                <ProtectedRoute allowedRoles={['patient']}>
                    <Recognize />
                </ProtectedRoute>
            } />

            <Route path="/patient/objects" element={
                <ProtectedRoute allowedRoles={['patient']}>
                    <ObjectRecognize />
                </ProtectedRoute>
            } />

            <Route path="/patient/memories" element={
                <ProtectedRoute allowedRoles={['patient']}>
                    <PatientMemories />
                </ProtectedRoute>
            } />

            <Route path="/patient/reminders" element={
                <ProtectedRoute allowedRoles={['patient']}>
                    <PatientReminders />
                </ProtectedRoute>
            } />

            {/* Caretaker Routes */}
            <Route path="/dashboard" element={
                <ProtectedRoute allowedRoles={['caretaker']}>
                    <CaretakerDashboard />
                </ProtectedRoute>
            } />

            <Route path="/dashboard/people" element={
                <ProtectedRoute allowedRoles={['caretaker']}>
                    <ManagePeople />
                </ProtectedRoute>
            } />

            <Route path="/dashboard/memories" element={
                <ProtectedRoute allowedRoles={['caretaker']}>
                    <MemoryEvents />
                </ProtectedRoute>
            } />

            <Route path="/dashboard/health" element={
                <ProtectedRoute allowedRoles={['caretaker']}>
                    <HealthMonitor />
                </ProtectedRoute>
            } />

            <Route path="/dashboard/voice" element={
                <ProtectedRoute allowedRoles={['caretaker']}>
                    <VoiceCloning />
                </ProtectedRoute>
            } />

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    )
}


function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Navbar />
                <AppRoutes />
            </AuthProvider>
        </BrowserRouter>
    )
}

export default App

