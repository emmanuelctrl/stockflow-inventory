import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Landing from './pages/Landing';
import OwnerLogin from './pages/OwnerLogin';
import OwnerDashboard from './pages/OwnerDashboard';
import WorkerScan from './pages/WorkerScan';
import ProtectedOwnerRoute from './components/ProtectedOwnerRoute';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/owner" element={<OwnerLogin />} />
          <Route
            path="/owner/dashboard"
            element={
              <ProtectedOwnerRoute>
                <OwnerDashboard />
              </ProtectedOwnerRoute>
            }
          />
          <Route path="/worker" element={<WorkerScan />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
