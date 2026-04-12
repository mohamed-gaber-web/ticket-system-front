import { useAppSelector, useAppDispatch } from './hooks';
import { signout } from '@/redux/slices/authSlice';
import { useNavigate } from 'react-router-dom';

/**
 * Custom hook for authentication
 * Provides auth state and helper functions
 */
export const useAuth = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const auth = useAppSelector((state) => state.auth);

  const logout = async () => {
    const isTeleSales = auth.userType === 'tele_sales';
    await dispatch(signout());
    navigate(isTeleSales ? '/tele-sales/login' : '/signin');
  };

  const isCustomer = auth.userType === 'customer';
  const isConsultant = auth.userType === 'consultant';
  const isTeamMember = auth.userType === 'team_member';

  return {
    ...auth,
    logout,
    isCustomer,
    isConsultant,
    isTeamMember,
  };
};
