import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '@/redux/hooks/hooks';
import type { UserType, ConsultantDepartment } from '@/types/auth.types';
import type { CustomerRole } from '@/types/customer.types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedUserTypes?: UserType[];
  requiredCustomerRole?: CustomerRole;
  /** Consultant departments allowed. If set, only consultants with one of these departments (or admin role) can access. */
  requiredDepartments?: ConsultantDepartment[];
  loginPath?: string;
}

const ProtectedRoute = ({ children, allowedUserTypes, requiredCustomerRole, requiredDepartments, loginPath = '/signin' }: ProtectedRouteProps) => {
  const { isAuthenticated, userType, customerRole, consultantDepartment, consultantRole } = useAppSelector((state) => state.auth);
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

  // If department restriction is set, check consultant department (admins bypass)
  if (requiredDepartments && requiredDepartments.length > 0 && userType === 'consultant') {
    if (consultantRole !== 'admin' && (!consultantDepartment || !requiredDepartments.includes(consultantDepartment))) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
