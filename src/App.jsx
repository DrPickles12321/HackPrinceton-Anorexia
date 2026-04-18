import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ParentView from './pages/ParentView'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/parent" element={<ParentView />} />
        <Route path="*" element={<Navigate to="/parent" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
