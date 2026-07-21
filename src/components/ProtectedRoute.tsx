// src/components/ProtectedRoute.tsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

type AllowedRole = 'admin' | 'rider' | 'both';

interface ProtectedRouteProps {
  children: JSX.Element;
  allowedRole?: AllowedRole;
  redirectTo?: string;
}

const ProtectedRoute = ({
  children,
  allowedRole = 'both',
  redirectTo = '/',
}: ProtectedRouteProps) => {
  const { isAdmin, isRider, loading } = useAuth();
  const location = useLocation();

  // Wait for auth to finish loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Check if user is authenticated
  const isAuthenticated = isAdmin || isRider;

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Check role-based access
  if (allowedRole === 'admin' && !isAdmin) {
    return <Navigate to="/rider/dashboard" replace />;
  }

  if (allowedRole === 'rider' && !isRider) {
    return <Navigate to="/admin" replace />;
  }

  // Authorized
  return children;
};

export default ProtectedRoute;