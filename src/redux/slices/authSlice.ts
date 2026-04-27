import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { authApi } from '@/api/authApi';
import type {
  AuthState,
  SignupRequest,
  SigninRequest,
  UpdateProfileRequest,
  ChangePasswordRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
} from '@/types/auth.types';

// Helper function to get user from localStorage
const getUserFromLocalStorage = () => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      return JSON.parse(userStr);
    } catch (error) {
      console.error('Failed to parse user from localStorage:', error);
      return null;
    }
  }
  return null;
};

const getConsultantRoleFromStorage = (): AuthState['consultantRole'] => {
  const userType = localStorage.getItem('userType');
  if (userType !== 'consultant') return null;
  const role = getUserFromLocalStorage()?.role;
  return (role as AuthState['consultantRole']) ?? null;
};

// Initial state
const initialState: AuthState = {
  user: getUserFromLocalStorage(),
  token: localStorage.getItem('token'),
  refreshToken: localStorage.getItem('refreshToken'),
  userType: (localStorage.getItem('userType') as AuthState['userType']) || null,
  customerRole: (getUserFromLocalStorage()?.role as AuthState['customerRole']) ?? null,
  consultantRole: getConsultantRoleFromStorage(),
  isAuthenticated: !!localStorage.getItem('token'),
  isLoading: false,
  error: null,
};

// Async Thunks

/**
 * Signup a new user
 */
export const signup = createAsyncThunk(
  'auth/signup',
  async (data: SignupRequest, { rejectWithValue }) => {
    try {
      const response = await authApi.signup(data);

      // Store tokens, userType, and user data in localStorage
      localStorage.setItem('token', response.token);
      localStorage.setItem('userType', response.userType);
      localStorage.setItem('user', JSON.stringify(response.data));
      if (response.refreshToken) {
        localStorage.setItem('refreshToken', response.refreshToken);
      }

      return response;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to signup. Please try again.'
      );
    }
  }
);

/**
 * Signin an existing user
 */
export const signin = createAsyncThunk(
  'auth/signin',
  async (data: SigninRequest, { rejectWithValue }) => {
    try {
      const response = await authApi.signin(data);

      // Store tokens, userType, and user data in localStorage
      localStorage.setItem('token', response.token);
      localStorage.setItem('userType', response.userType);
      localStorage.setItem('user', JSON.stringify(response.data));
      if (response.refreshToken) {
        localStorage.setItem('refreshToken', response.refreshToken);
      }

      return response;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Invalid credentials. Please try again.'
      );
    }
  }
);

/**
 * Signout the current user
 */
export const signout = createAsyncThunk(
  'auth/signout',
  async (_, { rejectWithValue }) => {
    try {
      await authApi.signout();

      // Clear localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userType');
      localStorage.removeItem('user');
      localStorage.removeItem('lastActivity');

      return null;
    } catch (error: any) {
      // Even if API call fails, clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userType');
      localStorage.removeItem('user');
      localStorage.removeItem('lastActivity');

      return rejectWithValue(
        error.response?.data?.message || 'Failed to signout.'
      );
    }
  }
);

/**
 * Get current user profile
 */
export const getProfile = createAsyncThunk(
  'auth/getProfile',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authApi.getProfile();
      return response;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to load profile.'
      );
    }
  }
);

/**
 * Update user profile
 */
export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (data: UpdateProfileRequest, { rejectWithValue }) => {
    try {
      const response = await authApi.updateProfile(data);
      return response;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to update profile.'
      );
    }
  }
);

/**
 * Change user password
 */
export const changePassword = createAsyncThunk(
  'auth/changePassword',
  async (data: ChangePasswordRequest, { rejectWithValue }) => {
    try {
      const response = await authApi.changePassword(data);
      return response;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to change password.'
      );
    }
  }
);

/**
 * Request password reset
 */
export const forgotPassword = createAsyncThunk(
  'auth/forgotPassword',
  async (data: ForgotPasswordRequest, { rejectWithValue }) => {
    try {
      const response = await authApi.forgotPassword(data);
      return response;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to request password reset.'
      );
    }
  }
);

/**
 * Reset password with token
 */
export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async (
    { resetToken, data }: { resetToken: string; data: ResetPasswordRequest },
    { rejectWithValue }
  ) => {
    try {
      const response = await authApi.resetPassword(resetToken, data);
      return response;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to reset password.'
      );
    }
  }
);

// Auth Slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCredentials: (state, action: PayloadAction<AuthState>) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken;
      state.userType = action.payload.userType;
      state.isAuthenticated = true;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.userType = null;
      state.customerRole = null;
      state.consultantRole = null;
      state.isAuthenticated = false;
      state.error = null;
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userType');
      localStorage.removeItem('user');
      localStorage.removeItem('lastActivity');
    },
  },
  extraReducers: (builder) => {
    // Signup
    builder
      .addCase(signup.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signup.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.data;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken || null;
        state.userType = action.payload.userType;
        state.customerRole = action.payload.userType === 'customer' ? ((action.payload.data as any)?.role ?? null) : null;
        state.consultantRole = action.payload.userType === 'consultant' ? ((action.payload.data as any)?.role ?? null) : null;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(signup.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Signin
    builder
      .addCase(signin.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signin.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.data;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken || null;
        state.userType = action.payload.userType;
        state.customerRole = action.payload.userType === 'customer' ? ((action.payload.data as any)?.role ?? null) : null;
        state.consultantRole = action.payload.userType === 'consultant' ? ((action.payload.data as any)?.role ?? null) : null;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(signin.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Signout
    builder
      .addCase(signout.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(signout.fulfilled, (state) => {
        state.isLoading = false;
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.userType = null;
        state.customerRole = null;
        state.consultantRole = null;
        state.isAuthenticated = false;
        state.error = null;
      })
      .addCase(signout.rejected, (state, action) => {
        state.isLoading = false;
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.userType = null;
        state.customerRole = null;
        state.consultantRole = null;
        state.isAuthenticated = false;
        state.error = action.payload as string;
      });

    // Get Profile
    builder
      .addCase(getProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.data;
        state.userType = action.payload.userType;
        state.customerRole = action.payload.userType === 'customer' ? ((action.payload.data as any)?.role ?? null) : null;
        state.consultantRole = action.payload.userType === 'consultant' ? ((action.payload.data as any)?.role ?? null) : null;
        state.error = null;

        // Update user data in localStorage when profile is fetched
        localStorage.setItem('user', JSON.stringify(action.payload.data));
        localStorage.setItem('userType', action.payload.userType);
      })
      .addCase(getProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update Profile
    builder
      .addCase(updateProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.data;
        state.customerRole = state.userType === 'customer' ? ((action.payload.data as any)?.role ?? null) : null;
        state.consultantRole = state.userType === 'consultant' ? ((action.payload.data as any)?.role ?? null) : null;
        state.error = null;

        // Update user data in localStorage when profile is updated
        localStorage.setItem('user', JSON.stringify(action.payload.data));
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Change Password
    builder
      .addCase(changePassword.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(changePassword.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Forgot Password
    builder
      .addCase(forgotPassword.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(forgotPassword.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Reset Password
    builder
      .addCase(resetPassword.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(resetPassword.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
