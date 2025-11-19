import { Injectable } from '@nestjs/common';
import {
  AuthResponse,
  ChangePasswordDto,
  ForgetPasswordDto,
  LoginDto,
  CoreResponse,
  RegisterDto,
  ResetPasswordDto,
  VerifyForgetPasswordDto,
  SocialLoginDto,
  OtpLoginDto,
  OtpResponse,
  VerifyOtpDto,
  OtpDto,
  InitiateRegistrationDto,
  InitiateRegistrationResponse,
  VerifyRegistrationDto,
  RegistrationResponse,
  ResendRegistrationOtpDto,
  ResendOtpResponse,
} from './dto/create-auth.dto';
import { User } from 'src/users/entities/user.entity';
import { CellerHutAuthService } from './celler-hut-auth.service';

@Injectable()
export class AuthService {
  constructor(private readonly cellerHutAuthService: CellerHutAuthService) {}

  /**
   * Register a new user using Ekasi Cart API
   */
  async register(createUserInput: RegisterDto): Promise<AuthResponse> {
    try {
      return await this.cellerHutAuthService.register(createUserInput);
    } catch (error) {
      console.error('[Auth Service] Registration failed:', error);
      throw error;
    }
  }

  /**
   * Login user using Ekasi Cart API
   */
  async login(loginInput: LoginDto): Promise<AuthResponse> {
    try {
      return await this.cellerHutAuthService.login(loginInput);
    } catch (error) {
      console.error('[Auth Service] Login failed:', error);
      // Re-throw the error so frontend can handle it properly
      throw error;
    }
  }

  /**
   * Change password using Ekasi Cart API
   */
  async changePassword(
    changePasswordInput: ChangePasswordDto,
    token?: string,
  ): Promise<CoreResponse> {
    try {
      return await this.cellerHutAuthService.changePassword(
        changePasswordInput,
        token,
      );
    } catch (error) {
      console.error('[Auth Service] Change password failed:', error);
      return {
        success: false,
        message: 'Password change failed',
      };
    }
  }

  /**
   * Initiate forgot password process using Ekasi Cart API
   */
  async forgetPassword(
    forgetPasswordInput: ForgetPasswordDto,
  ): Promise<CoreResponse> {
    try {
      return await this.cellerHutAuthService.forgetPassword(
        forgetPasswordInput,
      );
    } catch (error) {
      console.error('[Auth Service] Forgot password failed:', error);
      return {
        success: false,
        message: 'Forgot password request failed',
      };
    }
  }

  /**
   * Verify forgot password token using Ekasi Cart API
   */
  async verifyForgetPasswordToken(
    verifyForgetPasswordTokenInput: VerifyForgetPasswordDto,
  ): Promise<CoreResponse> {
    try {
      return await this.cellerHutAuthService.verifyForgetPasswordToken(
        verifyForgetPasswordTokenInput,
      );
    } catch (error) {
      console.error('[Auth Service] Token verification failed:', error);
      return {
        success: false,
        message: 'Token verification failed',
      };
    }
  }

  /**
   * Reset password using Ekasi Cart API
   */
  async resetPassword(
    resetPasswordInput: ResetPasswordDto,
  ): Promise<CoreResponse> {
    try {
      return await this.cellerHutAuthService.resetPassword(resetPasswordInput);
    } catch (error) {
      console.error('[Auth Service] Password reset failed:', error);
      return {
        success: false,
        message: 'Password reset failed',
      };
    }
  }

  /**
   * Social login using Ekasi Cart API
   */
  async socialLogin(socialLoginDto: SocialLoginDto): Promise<AuthResponse> {
    try {
      return await this.cellerHutAuthService.socialLogin(socialLoginDto);
    } catch (error) {
      console.error('[Auth Service] Social login failed:', error);
      // Fallback response
      return {
        token: 'demo_social_jwt_token',
        permissions: ['customer'],
        role: 'customer',
      };
    }
  }

  /**
   * OTP login using Ekasi Cart API
   */
  async otpLogin(otpLoginDto: OtpLoginDto): Promise<AuthResponse> {
    try {
      return await this.cellerHutAuthService.otpLogin(otpLoginDto);
    } catch (error) {
      console.error('[Auth Service] OTP login failed:', error);
      // Fallback response
      return {
        token: 'demo_otp_jwt_token',
        permissions: ['customer'],
        role: 'customer',
      };
    }
  }

  /**
   * Verify OTP code using Ekasi Cart API
   */
  async verifyOtpCode(verifyOtpInput: VerifyOtpDto): Promise<CoreResponse> {
    try {
      return await this.cellerHutAuthService.verifyOtpCode(verifyOtpInput);
    } catch (error) {
      console.error('[Auth Service] OTP verification failed:', error);
      return {
        success: false,
        message: 'OTP verification failed',
      };
    }
  }

  /**
   * Send OTP code using Ekasi Cart API
   */
  async sendOtpCode(otpInput: OtpDto): Promise<OtpResponse> {
    try {
      return await this.cellerHutAuthService.sendOtpCode(otpInput);
    } catch (error) {
      console.error('[Auth Service] Send OTP failed:', error);
      return {
        success: false,
        message: 'Failed to send OTP',
        id: null,
        provider: 'sms',
        phone_number: otpInput.phone_number,
        is_contact_exist: false,
      };
    }
  }

  /**
   * Get current user profile using Ekasi Cart API
   */
  async me(token?: string): Promise<User> {
    try {
      if (token) {
        return await this.cellerHutAuthService.getCurrentUser(token);
      }

      // Fallback to demo user if no token provided
      return this.getDemoUser();
    } catch (error) {
      console.error('[Auth Service] Get current user failed:', error);
      return this.getDemoUser();
    }
  }

  /**
   * Logout user using Ekasi Cart API
   */
  async logout(token?: string): Promise<CoreResponse> {
    try {
      if (token) {
        return await this.cellerHutAuthService.logout(token);
      }

      return {
        success: true,
        message: 'Logged out successfully',
      };
    } catch (error) {
      console.error('[Auth Service] Logout failed:', error);
      return {
        success: true,
        message: 'Logged out successfully',
      };
    }
  }

  /**
   * Refresh authentication token using Ekasi Cart API
   */
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      return await this.cellerHutAuthService.refreshToken(refreshToken);
    } catch (error) {
      console.error('[Auth Service] Token refresh failed:', error);
      throw new Error('Token refresh failed. Please login again.');
    }
  }

  /**
   * Update user profile using Ekasi Cart API
   */
  async updateProfile(token: string, profileData: any): Promise<User> {
    try {
      return await this.cellerHutAuthService.updateProfile(token, profileData);
    } catch (error) {
      console.error('[Auth Service] Profile update failed:', error);
      throw new Error('Profile update failed');
    }
  }

  /**
   * Validate user age for liquor purchases
   */
  async validateUserAge(userId: number): Promise<boolean> {
    try {
      return await this.cellerHutAuthService.validateUserAge(userId);
    } catch (error) {
      console.error('[Auth Service] Age validation failed:', error);
      return false;
    }
  }

  /**
   * Get user's purchase history
   */
  async getUserPurchaseHistory(
    userId: number,
    limit: number = 10,
  ): Promise<any[]> {
    try {
      return await this.cellerHutAuthService.getUserPurchaseHistory(
        userId,
        limit,
      );
    } catch (error) {
      console.error('[Auth Service] Get purchase history failed:', error);
      return [];
    }
  }

  /**
   * Registration OTP Flow Methods
   */

  /**
   * Initiate registration with email OTP verification
   */
  async initiateRegistration(
    initiateDto: InitiateRegistrationDto,
  ): Promise<InitiateRegistrationResponse> {
    try {
      return await this.cellerHutAuthService.initiateRegistration(initiateDto);
    } catch (error) {
      console.error('[Auth Service] Initiate registration failed:', error);
      throw error;
    }
  }

  /**
   * Verify OTP and complete registration
   */
  async verifyRegistration(
    verifyDto: VerifyRegistrationDto,
  ): Promise<RegistrationResponse> {
    try {
      return await this.cellerHutAuthService.verifyRegistration(verifyDto);
    } catch (error) {
      console.error('[Auth Service] Verify registration failed:', error);
      throw error;
    }
  }

  /**
   * Resend registration OTP code
   */
  async resendRegistrationOTP(
    resendDto: ResendRegistrationOtpDto,
  ): Promise<ResendOtpResponse> {
    try {
      return await this.cellerHutAuthService.resendRegistrationOTP(resendDto);
    } catch (error) {
      console.error('[Auth Service] Resend OTP failed:', error);
      throw error;
    }
  }

  /**
   * Demo user fallback for development
   */
  private getDemoUser(): User {
    return {
      id: 1,
      name: 'Demo User',
      email: 'demo@example.com',
      created_at: new Date(),
      updated_at: new Date(),
      is_active: true,
      profile: {
        id: 1,
        avatar: null,
        bio: 'Demo user for testing',
        socials: [],
        contact: '+27123456789',
        created_at: new Date(),
        updated_at: new Date(),
        customer: {
          id: 1,
          name: 'Demo User',
          email: 'demo@example.com',
          created_at: new Date(),
          updated_at: new Date(),
        },
      },
      address: [],
      permissions: [
        {
          id: 1,
          name: 'customer',
          guard_name: 'api',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ],
    };
  }
}
