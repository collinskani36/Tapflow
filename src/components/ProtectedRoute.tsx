import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { isAdmin, loading } = useAuth();
  const location = useLocation();

  // ✅ Wait for auth to finish loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading...
      </div>
    );
  }

  // ❌ Not logged in → redirect safely
  if (!isAdmin) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // ✅ Authorized
  return children;
};

export default ProtectedRoute;