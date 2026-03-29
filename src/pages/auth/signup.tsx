import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { signup, clearError } from '@/redux/slices/authSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  UserPlus,
  Sparkles,
  Building2,
  User,
  Phone,
  MapPin,
  Globe,
} from 'lucide-react';

const SignupPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isLoading, error, isAuthenticated } = useAppSelector((state) => state.auth);

  const [formData, setFormData] = useState({
    companyName: '',
    contactPerson: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    address: '',
    city: '',
    country: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (validationErrors[name]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.companyName.trim()) {
      errors.companyName = 'Company name is required';
    }

    if (!formData.contactPerson.trim()) {
      errors.contactPerson = 'Contact person is required';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required';
    }

    if (!formData.address.trim()) {
      errors.address = 'Address is required';
    }

    if (!formData.city.trim()) {
      errors.city = 'City is required';
    }

    if (!formData.country.trim()) {
      errors.country = 'Country is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await dispatch(
        signup({
          companyName: formData.companyName,
          contactPerson: formData.contactPerson,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          country: formData.country,
          userType: 'customer',
        })
      ).unwrap();

      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Signup failed:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-surface py-12">
      {/* Subtle Background Gradient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-brand-100/30 to-transparent rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
        <motion.div
          className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-accent-orange-100/20 to-transparent rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [90, 0, 90],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      </div>

      {/* Main Container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-3xl px-4 relative z-10"
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
            Create Your Account
          </h1>
          <p className="text-on-surface-variant mt-2">Join us and start managing your tickets</p>
        </motion.div>

        {/* Sign Up Card - Glassmorphism */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-[1.5rem] shadow-ambient p-8"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Company Information Section */}
            <div className="space-y-4">
              <h3 className="form-section-title flex items-center gap-2">
                <Building2 className="w-4 h-4 text-brand-500" />
                Company Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Company Name */}
                <div className="space-y-2">
                  <label htmlFor="companyName" className="form-label">
                    Company Name
                  </label>
                  <Input
                    id="companyName"
                    name="companyName"
                    type="text"
                    value={formData.companyName}
                    onChange={handleChange}
                    placeholder="Acme Corporation"
                    className={`h-12 ${
                      validationErrors.companyName
                        ? 'ring-[2px] ring-error/30'
                        : ''
                    }`}
                  />
                  {validationErrors.companyName && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-error text-xs"
                    >
                      {validationErrors.companyName}
                    </motion.p>
                  )}
                </div>

                {/* Contact Person */}
                <div className="space-y-2">
                  <label htmlFor="contactPerson" className="form-label flex items-center gap-2">
                    <User className="w-4 h-4 text-brand-500" />
                    Contact Person
                  </label>
                  <Input
                    id="contactPerson"
                    name="contactPerson"
                    type="text"
                    value={formData.contactPerson}
                    onChange={handleChange}
                    placeholder="John Doe"
                    className={`h-12 ${
                      validationErrors.contactPerson
                        ? 'ring-[2px] ring-error/30'
                        : ''
                    }`}
                  />
                  {validationErrors.contactPerson && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-error text-xs"
                    >
                      {validationErrors.contactPerson}
                    </motion.p>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Information Section */}
            <div className="space-y-4">
              <h3 className="form-section-title flex items-center gap-2">
                <Mail className="w-4 h-4 text-brand-500" />
                Contact Details
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Email */}
                <div className="space-y-2">
                  <label htmlFor="email" className="form-label">
                    Email Address
                  </label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className={`h-12 ${
                      validationErrors.email
                        ? 'ring-[2px] ring-error/30'
                        : ''
                    }`}
                  />
                  {validationErrors.email && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-error text-xs"
                    >
                      {validationErrors.email}
                    </motion.p>
                  )}
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <label htmlFor="phone" className="form-label flex items-center gap-2">
                    <Phone className="w-4 h-4 text-brand-500" />
                    Phone Number
                  </label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+1 (555) 000-0000"
                    className={`h-12 ${
                      validationErrors.phone
                        ? 'ring-[2px] ring-error/30'
                        : ''
                    }`}
                  />
                  {validationErrors.phone && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-error text-xs"
                    >
                      {validationErrors.phone}
                    </motion.p>
                  )}
                </div>
              </div>
            </div>

            {/* Password Section */}
            <div className="space-y-4">
              <h3 className="form-section-title flex items-center gap-2">
                <Lock className="w-4 h-4 text-brand-500" />
                Security
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Password */}
                <div className="space-y-2">
                  <label htmlFor="password" className="form-label">
                    Password
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="At least 6 characters"
                      className={`h-12 pr-12 ${
                        validationErrors.password
                          ? 'ring-[2px] ring-error/30'
                          : ''
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {validationErrors.password && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-error text-xs"
                    >
                      {validationErrors.password}
                    </motion.p>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="form-label">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Re-enter password"
                      className={`h-12 pr-12 ${
                        validationErrors.confirmPassword
                          ? 'ring-[2px] ring-error/30'
                          : ''
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
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
              </div>
            </div>

            {/* Address Section */}
            <div className="space-y-4">
              <h3 className="form-section-title flex items-center gap-2">
                <MapPin className="w-4 h-4 text-brand-500" />
                Address
              </h3>

              {/* Address */}
              <div className="space-y-2">
                <label htmlFor="address" className="form-label">
                  Street Address
                </label>
                <Input
                  id="address"
                  name="address"
                  type="text"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="123 Main Street"
                  className={`h-12 ${
                    validationErrors.address
                      ? 'ring-[2px] ring-error/30'
                      : ''
                  }`}
                />
                {validationErrors.address && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-error text-xs"
                  >
                    {validationErrors.address}
                  </motion.p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* City */}
                <div className="space-y-2">
                  <label htmlFor="city" className="form-label">
                    City
                  </label>
                  <Input
                    id="city"
                    name="city"
                    type="text"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="New York"
                    className={`h-12 ${
                      validationErrors.city
                        ? 'ring-[2px] ring-error/30'
                        : ''
                    }`}
                  />
                  {validationErrors.city && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-error text-xs"
                    >
                      {validationErrors.city}
                    </motion.p>
                  )}
                </div>

                {/* Country */}
                <div className="space-y-2">
                  <label htmlFor="country" className="form-label flex items-center gap-2">
                    <Globe className="w-4 h-4 text-brand-500" />
                    Country
                  </label>
                  <Input
                    id="country"
                    name="country"
                    type="text"
                    value={formData.country}
                    onChange={handleChange}
                    placeholder="United States"
                    className={`h-12 ${
                      validationErrors.country
                        ? 'ring-[2px] ring-error/30'
                        : ''
                    }`}
                  />
                  {validationErrors.country && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-error text-xs"
                    >
                      {validationErrors.country}
                    </motion.p>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
              <Button
                type="submit"
                disabled={isLoading}
                size="xl"
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                    />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5" />
                    Create Account
                  </>
                )}
              </Button>
            </motion.div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full h-px bg-surface-container-high"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-surface-container-lowest text-on-surface-variant">Already have an account?</span>
              </div>
            </div>

            {/* Sign In Link */}
            <div className="text-center">
              <Link
                to="/signin"
                className="inline-flex items-center gap-2 text-sm font-medium text-on-surface-variant hover:text-brand-500 transition-colors"
              >
                Sign in instead
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

        {/* Footer Text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-sm text-on-surface-variant mt-6"
        >
          By creating an account, you agree to our Terms of Service and Privacy Policy
        </motion.p>
      </motion.div>
    </div>
  );
};

export default SignupPage;
