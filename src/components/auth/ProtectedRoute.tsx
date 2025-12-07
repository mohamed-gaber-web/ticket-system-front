import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '@/redux/hooks/hooks';
import type { UserType } from '@/types/auth.types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedUserTypes?: UserType[];
}

const ProtectedRoute = ({ children, allowedUserTypes }: ProtectedRouteProps) => {
  const { isAuthenticated, userType } = useAppSelector((state) => state.auth);
  const location = useLocation();

  // If not authenticated, redirect to signin
  if (!isAuthenticated) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  // If allowedUserTypes is specified, check if current user type is allowed
  if (allowedUserTypes && allowedUserTypes.length > 0) {
    if (!userType || !allowedUserTypes.includes(userType)) {
      // Redirect to unauthorized page or dashboard
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
