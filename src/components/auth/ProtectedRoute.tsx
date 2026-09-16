import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAppSelector } from '@/redux/hooks/hooks';
import { useAccess } from '@/redux/hooks/useAccess';
import type { UserType, ModuleKey } from '@/types/auth.types';
import type { CustomerRole } from '@/types/customer.types';

export const LOGIN_PATH = '/login';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedUserTypes?: UserType[];
  requiredCustomerRole?: CustomerRole;
  /** The employee must be able to open this module (admins always can). */
  module?: ModuleKey;
  /** The employee must hold at least this rank. */
  minRole?: 'manager' | 'admin';
}

/**
 * Route guard. Unauthenticated → /login; the wrong kind of user, a missing
 * module or an insufficient role → /unauthorized. The API re-checks all of it,
 * so this only decides what the browser shows, never what it may fetch.
 */
const ProtectedRoute = ({
  children,
  allowedUserTypes,
  requiredCustomerRole,
  module,
  minRole,
}: ProtectedRouteProps) => {
  const { isAuthenticated, userType, customerRole } = useAppSelector((state) => state.auth);
  const access = useAccess();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to={LOGIN_PATH} state={{ from: location }} replace />;
  }

  if (allowedUserTypes && allowedUserTypes.length > 0) {
    if (!userType || !allowedUserTypes.includes(userType)) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  if (requiredCustomerRole && customerRole !== requiredCustomerRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (module && !(access.isEmployee && access.hasModule(module))) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (minRole === 'admin' && !access.isAdmin) {
    return <Navigate to="/unauthorized" replace />;
  }
  if (minRole === 'manager' && !access.isManagerOrAdmin) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;

// ── Named wrappers — read better in the route table ──────────────────────────

export const EmployeeRoute = ({ children }: { children: ReactNode }) => (
  <ProtectedRoute allowedUserTypes={['employee']}>{children}</ProtectedRoute>
);

export const CustomerRoute = ({
  children,
  role,
}: {
  children: ReactNode;
  role?: CustomerRole;
}) => (
  <ProtectedRoute allowedUserTypes={['customer']} requiredCustomerRole={role}>
    {children}
  </ProtectedRoute>
);

export const ModuleRoute = ({ children, module }: { children: ReactNode; module: ModuleKey }) => (
  <ProtectedRoute allowedUserTypes={['employee']} module={module}>
    {children}
  </ProtectedRoute>
);

export const ManagerRoute = ({ children }: { children: ReactNode }) => (
  <ProtectedRoute allowedUserTypes={['employee']} minRole="manager">
    {children}
  </ProtectedRoute>
);

export const AdminRoute = ({ children }: { children: ReactNode }) => (
  <ProtectedRoute allowedUserTypes={['employee']} minRole="admin">
    {children}
  </ProtectedRoute>
);
