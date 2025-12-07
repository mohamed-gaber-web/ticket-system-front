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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-3xl"
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
          className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-purple-400/10 to-pink-400/10 rounded-full blur-3xl"
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
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/50 mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Create Your Account
          </h1>
          <p className="text-gray-600 mt-2">Join us and start managing your tickets</p>
        </motion.div>

        {/* Sign Up Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-gray-200/50 border border-gray-100 p-8"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Company Information Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-500" />
                Company Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Company Name */}
                <div className="space-y-2">
                  <label htmlFor="companyName" className="text-sm font-semibold text-gray-700">
                    Company Name
                  </label>
                  <Input
                    id="companyName"
                    name="companyName"
                    type="text"
                    value={formData.companyName}
                    onChange={handleChange}
                    placeholder="Acme Corporation"
                    className={`h-12 pl-4 pr-4 rounded-xl border-2 transition-all duration-200 ${
                      validationErrors.companyName
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                        : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500 hover:border-gray-300'
                    } bg-white/50`}
                  />
                  {validationErrors.companyName && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-500 text-xs"
                    >
                      {validationErrors.companyName}
                    </motion.p>
                  )}
                </div>

                {/* Contact Person */}
                <div className="space-y-2">
                  <label htmlFor="contactPerson" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-500" />
                    Contact Person
                  </label>
                  <Input
                    id="contactPerson"
                    name="contactPerson"
                    type="text"
                    value={formData.contactPerson}
                    onChange={handleChange}
                    placeholder="John Doe"
                    className={`h-12 pl-4 pr-4 rounded-xl border-2 transition-all duration-200 ${
                      validationErrors.contactPerson
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                        : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500 hover:border-gray-300'
                    } bg-white/50`}
                  />
                  {validationErrors.contactPerson && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-500 text-xs"
                    >
                      {validationErrors.contactPerson}
                    </motion.p>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Information Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-500" />
                Contact Details
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Email */}
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-semibold text-gray-700">
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
                    className={`h-12 pl-4 pr-4 rounded-xl border-2 transition-all duration-200 ${
                      validationErrors.email
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                        : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500 hover:border-gray-300'
                    } bg-white/50`}
                  />
                  {validationErrors.email && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-500 text-xs"
                    >
                      {validationErrors.email}
                    </motion.p>
                  )}
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <label htmlFor="phone" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-blue-500" />
                    Phone Number
                  </label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+1 (555) 000-0000"
                    className={`h-12 pl-4 pr-4 rounded-xl border-2 transition-all duration-200 ${
                      validationErrors.phone
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                        : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500 hover:border-gray-300'
                    } bg-white/50`}
                  />
                  {validationErrors.phone && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-500 text-xs"
                    >
                      {validationErrors.phone}
                    </motion.p>
                  )}
                </div>
              </div>
            </div>

            {/* Password Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                <Lock className="w-4 h-4 text-blue-500" />
                Security
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Password */}
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-semibold text-gray-700">
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
                      className={`h-12 pl-4 pr-12 rounded-xl border-2 transition-all duration-200 ${
                        validationErrors.password
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                          : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500 hover:border-gray-300'
                      } bg-white/50`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {validationErrors.password && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-500 text-xs"
                    >
                      {validationErrors.password}
                    </motion.p>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="text-sm font-semibold text-gray-700">
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
                      className={`h-12 pl-4 pr-12 rounded-xl border-2 transition-all duration-200 ${
                        validationErrors.confirmPassword
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                          : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500 hover:border-gray-300'
                      } bg-white/50`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {validationErrors.confirmPassword && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-500 text-xs"
                    >
                      {validationErrors.confirmPassword}
                    </motion.p>
                  )}
                </div>
              </div>
            </div>

            {/* Address Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-500" />
                Address
              </h3>

              {/* Address */}
              <div className="space-y-2">
                <label htmlFor="address" className="text-sm font-semibold text-gray-700">
                  Street Address
                </label>
                <Input
                  id="address"
                  name="address"
                  type="text"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="123 Main Street"
                  className={`h-12 pl-4 pr-4 rounded-xl border-2 transition-all duration-200 ${
                    validationErrors.address
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500 hover:border-gray-300'
                  } bg-white/50`}
                />
                {validationErrors.address && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-500 text-xs"
                  >
                    {validationErrors.address}
                  </motion.p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* City */}
                <div className="space-y-2">
                  <label htmlFor="city" className="text-sm font-semibold text-gray-700">
                    City
                  </label>
                  <Input
                    id="city"
                    name="city"
                    type="text"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="New York"
                    className={`h-12 pl-4 pr-4 rounded-xl border-2 transition-all duration-200 ${
                      validationErrors.city
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                        : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500 hover:border-gray-300'
                    } bg-white/50`}
                  />
                  {validationErrors.city && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-500 text-xs"
                    >
                      {validationErrors.city}
                    </motion.p>
                  )}
                </div>

                {/* Country */}
                <div className="space-y-2">
                  <label htmlFor="country" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-blue-500" />
                    Country
                  </label>
                  <Input
                    id="country"
                    name="country"
                    type="text"
                    value={formData.country}
                    onChange={handleChange}
                    placeholder="United States"
                    className={`h-12 pl-4 pr-4 rounded-xl border-2 transition-all duration-200 ${
                      validationErrors.country
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                        : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500 hover:border-gray-300'
                    } bg-white/50`}
                  />
                  {validationErrors.country && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-500 text-xs"
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
                className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold shadow-lg shadow-blue-500/30 transition-all duration-200 flex items-center justify-center gap-2"
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
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">Already have an account?</span>
              </div>
            </div>

            {/* Sign In Link */}
            <div className="text-center">
              <Link
                to="/signin"
                className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
              >
                Sign in instead
                <motion.span
                  animate={{ x: [0, 4, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  →
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
          className="text-center text-sm text-gray-500 mt-6"
        >
          By creating an account, you agree to our Terms of Service and Privacy Policy
        </motion.p>
      </motion.div>
    </div>
  );
};

export default SignupPage;
