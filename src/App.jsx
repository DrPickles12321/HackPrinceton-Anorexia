import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { RealtimeProvider } from './contexts/RealtimeContext'
import { NutritionalTargetsProvider } from './contexts/NutritionalTargetsContext'
import Navbar from './components/Navbar'
import Login from './pages/Login'
import ParentView from './pages/ParentView'
import DailyView from './pages/DailyView'
import WeeklyView from './pages/WeeklyView'
import StatsView from './pages/StatsView'
import ClinicianView from './pages/ClinicianView'

function AppLayout() {
  const { pathname } = useLocation()
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
    <NutritionalTargetsProvider>
      <RealtimeProvider>
        <BrowserRouter>
          <AppLayout />
        </BrowserRouter>
      </RealtimeProvider>
    </NutritionalTargetsProvider>
  )
}
