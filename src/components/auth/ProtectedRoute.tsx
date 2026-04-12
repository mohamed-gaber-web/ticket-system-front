import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '@/redux/hooks/hooks';
import type { UserType } from '@/types/auth.types';
import type { CustomerRole } from '@/types/customer.types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedUserTypes?: UserType[];
  requiredCustomerRole?: CustomerRole;
  loginPath?: string;
}

const ProtectedRoute = ({ children, allowedUserTypes, requiredCustomerRole, loginPath = '/signin' }: ProtectedRouteProps) => {
  const { isAuthenticated, userType, customerRole } = useAppSelector((state) => state.auth);
  const location = useLocation();

  // If not authenticated, redirect to the appropriate login page
  if (!isAuthenticated) {
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  // If allowedUserTypes is specified, check if current user type is allowed
  if (allowedUserTypes && allowedUserTypes.length > 0) {
    if (!userType || !allowedUserTypes.includes(userType)) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // If a specific customer role is required, check it
  if (requiredCustomerRole && customerRole !== requiredCustomerRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
