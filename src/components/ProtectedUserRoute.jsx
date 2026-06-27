import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

export default function ProtectedUserRoute({ children }) {
  const { isUserAuthenticated } = useAuth();
  return isUserAuthenticated ? children : <Navigate to="/login" replace />;
}
