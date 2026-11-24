import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';

export interface MailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: MailAttachment[];
}

export interface MailResult {
  delivered: boolean;
  /** Why the message was not delivered (SMTP not configured or provider error). */
  error?: string;
  messageId?: string;
}

/**
 * SMTP mailer. Configured through SMTP_HOST, SMTP_PORT, SMTP_SECURE,
 * SMTP_USER, SMTP_PASS and SMTP_FROM. Without SMTP_HOST it reports
 * "not delivered" instead of throwing, so callers can tell the user.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.config.get<string>('SMTP_HOST'));
  }

  async send(message: MailMessage): Promise<MailResult> {
    if (!this.isConfigured()) {
      this.logger.warn(`SMTP no configurado: no se envió "${message.subject}"`);
      return { delivered: false, error: 'El servidor de correo (SMTP) no está configurado' };
    }
    try {
      const info = await this.getTransporter().sendMail({
        from: this.config.get<string>('SMTP_FROM') ?? this.config.get<string>('SMTP_USER'),
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
        attachments: message.attachments,
      });
      return { delivered: true, messageId: String(info.messageId) };
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      this.logger.error(`Fallo SMTP enviando "${message.subject}": ${detail}`);
      return { delivered: false, error: 'El servidor de correo rechazó el envío' };
    }
  }

  private getTransporter(): Transporter {
    if (!this.transporter) {
      const user = this.config.get<string>('SMTP_USER');
      this.transporter = createTransport({
        host: this.config.get<string>('SMTP_HOST'),
        port: Number(this.config.get<string>('SMTP_PORT') ?? 587),
        secure: this.config.get<string>('SMTP_SECURE') === 'true',
        auth: user ? { user, pass: this.config.get<string>('SMTP_PASS') } : undefined,
      });
    }
    return this.transporter;
  }
}
