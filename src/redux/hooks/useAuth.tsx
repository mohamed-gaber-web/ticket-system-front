import { useAppSelector, useAppDispatch } from './hooks';
import { signout } from '@/redux/slices/authSlice';
import { useNavigate } from 'react-router-dom';
import { disconnectSocket } from '@/lib/socket';
import { useAccess } from './useAccess';

/**
 * Custom hook for authentication
 * Provides auth state and helper functions. Role/module questions live in
 * useAccess(); the common ones are re-exposed here for convenience.
 */
export const useAuth = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const auth = useAppSelector((state) => state.auth);
  const access = useAccess();

  const logout = async () => {
    disconnectSocket();
    await dispatch(signout());
    navigate('/login');
  };

  return {
    ...auth,
    logout,
    isCustomer: access.isCustomer,
    isEmployee: access.isEmployee,
    isAdmin: access.isAdmin,
    isManager: access.isManager,
    hasModule: access.hasModule,
  };
};
