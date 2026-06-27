import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Landing from './pages/Landing';
import OwnerLogin from './pages/OwnerLogin';
import OwnerDashboard from './pages/OwnerDashboard';
import WorkerScan from './pages/WorkerScan';
import GoogleLoginPage from './pages/GoogleLogin';
import UserDashboard from './pages/UserDashboard';
import ProtectedOwnerRoute from './components/ProtectedOwnerRoute';
import ProtectedUserRoute from './components/ProtectedUserRoute';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<GoogleLoginPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedUserRoute>
                <UserDashboard />
              </ProtectedUserRoute>
            }
          />
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
