import * as crypto from 'crypto';
import * as util from 'util';

const scrypt = util.promisify(crypto.scrypt);

export class PasswordService {
  private static readonly SALT_LENGTH = 32;
  private static readonly KEY_LENGTH = 64;
  private static readonly SEPARATOR = '.';

  /**
   * Hash a password using scrypt
   */
  static async hashPassword(password: string): Promise<string> {
    const salt = crypto.randomBytes(this.SALT_LENGTH).toString('hex');
    const derivedKey = (await scrypt(password, salt, this.KEY_LENGTH)) as Buffer;
    return `${salt}${this.SEPARATOR}${derivedKey.toString('hex')}`;
  }

  /**
   * Verify a password against a hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      const [salt, hashedPassword] = hash.split(this.SEPARATOR);
      if (!salt || !hashedPassword) return false;

      const derivedKey = (await scrypt(password, salt, this.KEY_LENGTH)) as Buffer;
      return crypto.timingSafeEqual(
        Buffer.from(hashedPassword, 'hex'),
        derivedKey
      );
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  }

  /**
   * Generate a secure random session token
   */
  static generateSessionToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Validate password strength
   */
  static validatePasswordStrength(password: string): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('كلمة المرور يجب أن تحتوي على حرف صغير واحد على الأقل');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل');
    }

    if (!/[0-9]/.test(password)) {
      errors.push('كلمة المرور يجب أن تحتوي على رقم واحد على الأقل');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
