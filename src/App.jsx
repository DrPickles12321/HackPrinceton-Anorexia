import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { RealtimeProvider } from './contexts/RealtimeContext'
import { NutritionalTargetsProvider } from './contexts/NutritionalTargetsContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { FirebaseDataProvider } from './contexts/FirebaseDataContext'
import Navbar from './components/Navbar'
import LoginScreen from './components/LoginScreen'
import Login from './pages/Login'
import ParentView from './pages/ParentView'
import DailyView from './pages/DailyView'
import WeeklyView from './pages/WeeklyView'
import StatsView from './pages/StatsView'
import ClinicianView from './pages/ClinicianView'

function AppLayout() {
  const { user, role } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()

  // Redirect to the correct view based on role; block access to the wrong view
  useEffect(() => {
    if (!user || !role) return
    const onParent    = pathname.startsWith('/parent')
    const onClinician = pathname.startsWith('/clinician')
    const onRoot      = pathname === '/'
    if (role === 'parent' && (onRoot || onClinician)) {
      navigate('/parent/daily', { replace: true })
    } else if (role === 'clinician' && (onRoot || onParent)) {
      navigate('/clinician', { replace: true })
    }
  }, [user, role, pathname, navigate])

  // Still resolving auth state — show neutral spinner
  if (user === undefined) {
    return (
      <div style={{
        minHeight: '100svh', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: '#F5EFE6',
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: '50%',
          border: '3px solid #E8735A', borderTopColor: 'transparent',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  // Not authenticated — show Firebase login screen
  if (!user) return <LoginScreen />

  // Authenticated — show existing app unchanged
  return (
    <>
      {pathname !== '/' && <Navbar />}
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/parent" element={<ParentView />}>
          <Route index element={<Navigate to="daily" replace />} />
          <Route path="daily" element={<DailyView />} />
          <Route path="weekly" element={<WeeklyView />} />
          <Route path="stats" element={<StatsView />} />
        </Route>
        <Route path="/clinician" element={<ClinicianView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <FirebaseDataProvider>
        <NutritionalTargetsProvider>
          <RealtimeProvider>
            <BrowserRouter>
              <AppLayout />
            </BrowserRouter>
          </RealtimeProvider>
        </NutritionalTargetsProvider>
      </FirebaseDataProvider>
    </AuthProvider>
  )
}
