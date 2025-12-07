import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { forgotPassword } from '@/redux/slices/authSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center text-green-600">
              Email Sent!
            </CardTitle>
            <CardDescription className="text-center">
              Check your inbox for password reset instructions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-sm text-gray-600">
              We've sent password reset instructions to <strong>{email}</strong>. Please check your
              email and follow the instructions to reset your password.
            </p>
            <div className="text-center">
              <Link to="/signin" className="text-blue-600 hover:text-blue-800 font-medium text-sm">
                Return to Sign In
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Forgot Password</CardTitle>
          <CardDescription className="text-center">
            Enter your email to receive password reset instructions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email <span className="text-red-500">*</span>
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
                className={validationError ? 'border-red-500' : ''}
              />
              {validationError && <p className="text-red-500 text-xs">{validationError}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Sending...' : 'Send Reset Instructions'}
            </Button>

            <div className="text-center text-sm">
              Remember your password?{' '}
              <Link to="/signin" className="text-blue-600 hover:text-blue-800 font-medium">
                Sign In
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPasswordPage;
