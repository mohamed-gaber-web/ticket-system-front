import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { forgotPassword } from '@/redux/slices/authSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Mail, Sparkles, CheckCircle } from 'lucide-react';

const ForgotPasswordPage = () => {
  const dispatch = useAppDispatch();
  const { isLoading } = useAppSelector((state) => state.auth);

  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [validationError, setValidationError] = useState('');

  const validateEmail = (): boolean => {
    if (!email.trim()) {
      setValidationError('Email is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setValidationError('Invalid email format');
      return false;
    }
    setValidationError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateEmail()) {
      return;
    }

    try {
      await dispatch(
        forgotPassword({
          email,
          userType: 'customer',
        })
      ).unwrap();

      setEmailSent(true);
      toast.success('Password reset instructions have been sent to your email!');
    } catch (error: any) {
      toast.error(error || 'Failed to send reset email. Please try again.');
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-surface py-12 px-4">
        {/* Subtle Background Gradient */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-brand-100/30 to-transparent rounded-full blur-3xl"
            animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md relative z-10"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-[1.25rem] bg-green-500 mb-4">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h1 className="display-sm text-on-surface">
              Email Sent!
            </h1>
            <p className="text-on-surface-variant mt-2">Check your inbox for password reset instructions</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass rounded-[1.5rem] shadow-ambient p-8"
          >
            <div className="space-y-6">
              <p className="text-center text-sm text-on-surface-variant">
                We've sent password reset instructions to <strong className="text-on-surface">{email}</strong>. Please check your
                email and follow the instructions to reset your password.
              </p>
              <div className="text-center">
                <Link to="/signin" className="text-sm font-medium text-brand-500 hover:text-brand-600 transition-colors">
                  Return to Sign In
                </Link>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-surface py-12 px-4">
      {/* Subtle Background Gradient */}
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
        {/* Logo/Brand Section */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-[1.25rem] bg-primary-gradient mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="display-sm text-on-surface">
            Forgot Password
          </h1>
          <p className="text-on-surface-variant mt-2">Enter your email to receive password reset instructions</p>
        </motion.div>

        {/* Forgot Password Card - Glassmorphism */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-[1.5rem] shadow-ambient p-8"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="form-label flex items-center gap-2">
                <Mail className="w-4 h-4 text-brand-500" />
                Email <span className="text-error">*</span>
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (validationError) setValidationError('');
                }}
                placeholder="Enter your email"
                autoComplete="email"
                className={`h-12 ${validationError ? 'ring-[2px] ring-error/30' : ''}`}
              />
              {validationError && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-error text-xs"
                >
                  {validationError}
                </motion.p>
              )}
            </div>

            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
              <Button type="submit" size="xl" className="w-full" disabled={isLoading}>
                {isLoading ? 'Sending...' : 'Send Reset Instructions'}
              </Button>
            </motion.div>

            {/* Divider */}
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

export default ForgotPasswordPage;
