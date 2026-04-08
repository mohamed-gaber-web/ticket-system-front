import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { resetPassword } from '@/redux/slices/authSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Lock, Sparkles } from 'lucide-react';

const ResetPasswordPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { token, userType } = useParams<{ token: string; userType: string }>();
  const { isLoading } = useAppSelector((state) => state.auth);

  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (validationErrors[name]) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.newPassword) {
      errors.newPassword = 'Password is required';
    } else if (formData.newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters';
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.newPassword !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !token || !userType) {
      if (!token || !userType) {
        toast.error('Invalid or malformed reset link');
      }
      return;
    }

    try {
      await dispatch(
        resetPassword({
          resetToken: token,
          data: {
            newPassword: formData.newPassword,
            userType,
          },
        })
      ).unwrap();

      toast.success('Password reset successfully! Please sign in with your new password.');
      navigate('/signin');
    } catch (error: any) {
      toast.error(error || 'Failed to reset password. The link may have expired.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-surface py-12 px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-brand-100/30 to-transparent rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-accent-orange-100/20 to-transparent rounded-full blur-3xl"
          animate={{ scale: [1.2, 1, 1.2], rotate: [90, 0, 90] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Brand Section */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-[1.25rem] bg-primary-gradient mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="display-sm text-on-surface">Reset Password</h1>
          <p className="text-on-surface-variant mt-2">Enter your new password below</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-[1.5rem] shadow-ambient p-8"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="newPassword" className="form-label flex items-center gap-2">
                <Lock className="w-4 h-4 text-brand-500" />
                New Password <span className="text-error">*</span>
              </label>
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                value={formData.newPassword}
                onChange={handleChange}
                placeholder="At least 8 characters"
                className={`h-12 ${validationErrors.newPassword ? 'ring-[2px] ring-error/30' : ''}`}
              />
              {validationErrors.newPassword && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-error text-xs"
                >
                  {validationErrors.newPassword}
                </motion.p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="form-label flex items-center gap-2">
                <Lock className="w-4 h-4 text-brand-500" />
                Confirm Password <span className="text-error">*</span>
              </label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm new password"
                className={`h-12 ${validationErrors.confirmPassword ? 'ring-[2px] ring-error/30' : ''}`}
              />
              {validationErrors.confirmPassword && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-error text-xs"
                >
                  {validationErrors.confirmPassword}
                </motion.p>
              )}
            </div>

            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
              <Button type="submit" size="xl" className="w-full" disabled={isLoading}>
                {isLoading ? 'Resetting Password...' : 'Reset Password'}
              </Button>
            </motion.div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full h-px bg-surface-container-high"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-surface-container-lowest text-on-surface-variant">Remember your password?</span>
              </div>
            </div>

            <div className="text-center">
              <Link
                to="/signin"
                className="inline-flex items-center gap-2 text-sm font-medium text-on-surface-variant hover:text-brand-500 transition-colors"
              >
                Sign In
                <motion.span
                  animate={{ x: [0, 4, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  &rarr;
                </motion.span>
              </Link>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default ResetPasswordPage;
