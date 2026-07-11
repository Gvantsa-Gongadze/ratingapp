import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const RESEND_API_URL = 'https://api.resend.com/emails';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly apiKey: string;
  private readonly from: string;

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('RESEND_API_KEY', '');
    this.from = config.get<string>('EMAIL_FROM', 'onboarding@resend.dev');
  }

  /**
   * Never throws — a failed/unconfigured email send must not turn into a
   * 500, and forgotPassword() relies on this to avoid leaking whether an
   * email is registered via response timing/errors.
   */
  async sendPasswordReset(to: string, resetUrl: string): Promise<void> {
    if (!this.apiKey) {
      this.logger.warn(`RESEND_API_KEY not set — reset link for ${to}: ${resetUrl}`);
      return;
    }

    try {
      const res = await fetch(RESEND_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.from,
          to,
          subject: 'Reset your RatingApp password',
          html: `
            <p>Someone requested a password reset for your RatingApp account.</p>
            <p><a href="${resetUrl}">Reset your password</a></p>
            <p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
          `,
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        this.logger.error(`Resend request failed: ${res.status} ${body}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send password reset email: ${error}`);
    }
  }
}
