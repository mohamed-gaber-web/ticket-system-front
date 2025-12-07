// User Types
export type UserType = 'customer' | 'consultant' | 'team_member';

export type UserStatus = 'active' | 'inactive' | 'suspended';

// Base User Interface
export interface User {
  _id: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  userType: UserType;
  status: UserStatus;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

// Customer specific fields
export interface Customer extends User {
  userType: 'customer';
  slaMapping?: string;
}

// Consultant specific fields
export interface Consultant extends User {
  userType: 'consultant';
  expertise?: string[];
  availabilityStatus?: string;
}

// Team Member specific fields
export interface TeamMember extends User {
  userType: 'team_member';
  team?: string;
  role?: string;
}

// Authentication Request/Response Types
export interface SignupRequest {
  companyName: string;
  contactPerson: string;
  email: string;
  password: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  userType: UserType;
}

export interface SigninRequest {
  email: string;
  password: string;
  userType: UserType;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: User | Customer | Consultant | TeamMember;
  token: string;
  refreshToken?: string;
  userType: UserType;
}

export interface ProfileResponse {
  success: boolean;
  userType: UserType;
  data: User | Customer | Consultant | TeamMember;
}

export interface UpdateProfileRequest {
  companyName?: string;
  contactPerson?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  status?: UserStatus;
  slaMapping?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ForgotPasswordRequest {
  email: string;
  userType: UserType;
}

export interface ResetPasswordRequest {
  newPassword: string;
  userType: UserType;
}

export interface RefreshTokenRequest {
  refreshToken: string;
  userType: UserType;
}

// Auth State Interface
export interface AuthState {
  user: User | Customer | Consultant | TeamMember | null;
  token: string | null;
  refreshToken: string | null;
  userType: UserType | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
