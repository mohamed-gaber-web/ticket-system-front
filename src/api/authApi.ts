import api from './axiosConfig';
import type {
  SignupRequest,
  SigninRequest,
  AuthResponse,
  ProfileResponse,
  UpdateProfileRequest,
  ChangePasswordRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  RefreshTokenRequest,
} from '@/types/auth.types';

/**
 * Authentication API Service
 * Handles all authentication-related API calls
 */
export const authApi = {
  /**
   * Register a new user
   * @param data - Signup data including email, password, userType, etc.
   */
  signup: async (data: SignupRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/signup', data);
    return response.data;
  },

  /**
   * Sign in an existing user
   * @param data - Signin credentials (email, password, userType)
   */
  signin: async (data: SigninRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/signin', data);
    return response.data;
  },

  /**
   * Sign out the current user
   */
  signout: async (): Promise<{ success: boolean; message: string }> => {
    const response = await api.post('/auth/signout');
    return response.data;
  },

  /**
   * Get current user profile
   */
  getProfile: async (): Promise<ProfileResponse> => {
    const response = await api.get<ProfileResponse>('/auth/profile');
    return response.data;
  },

  /**
   * Update current user profile
   * @param data - Profile data to update
   */
  updateProfile: async (data: UpdateProfileRequest): Promise<ProfileResponse> => {
    const response = await api.put<ProfileResponse>('/auth/profile', data);
    return response.data;
  },

  /**
   * Change user password
   * @param data - Current and new password
   */
  changePassword: async (
    data: ChangePasswordRequest
  ): Promise<{ success: boolean; message: string }> => {
    const response = await api.put('/auth/change-password', data);
    return response.data;
  },

  /**
   * Request password reset token
   * @param data - Email and userType
   */
  forgotPassword: async (
    data: ForgotPasswordRequest
  ): Promise<{ success: boolean; message: string; resetToken?: string }> => {
    const response = await api.post('/auth/forgot-password', data);
    return response.data;
  },

  /**
   * Reset password using reset token
   * @param resetToken - Token from forgot password email
   * @param data - New password and userType
   */
  resetPassword: async (
    resetToken: string,
    data: ResetPasswordRequest
  ): Promise<{ success: boolean; message: string }> => {
    const response = await api.put(`/auth/reset-password/${resetToken}`, data);
    return response.data;
  },

  /**
   * Refresh access token
   * @param data - Refresh token and userType
   */
  refreshToken: async (
    data: RefreshTokenRequest
  ): Promise<{ success: boolean; message: string; data: any; token: string }> => {
    const response = await api.post('/auth/refresh-token', data);
    return response.data;
  },
};
