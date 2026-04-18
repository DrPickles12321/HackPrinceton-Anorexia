import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ParentView from './pages/ParentView'
import ClinicianView from './pages/ClinicianView'
import Navbar from './components/Navbar'

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/parent" element={<ParentView />} />
        <Route path="/clinician" element={<ClinicianView />} />
        <Route path="*" element={<Navigate to="/parent" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
