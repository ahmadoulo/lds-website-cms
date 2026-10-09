import { Injectable } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';
import {
  EmailSettingsService,
  type TransportConfig,
} from './email-settings.service';
import { assertHeaderSafe, isPlausibleEmail } from './render';

export interface OutgoingEmail {
  to: string;
  toName?: string | null;
  fromName: string;
  fromEmail: string;
  replyTo?: string | null;
  subject: string;
  html: string;
  text: string;
}

export class SmtpNotConfiguredError extends Error {
  constructor() {
    super('Le serveur SMTP n’est pas configuré.');
  }
}

/**
 * Whether trying again could ever help.
 *
 * SMTP says so itself: a 4xx reply is "not now", a 5xx is "not ever". A
 * connection that never opened, timed out or dropped is a 4xx in spirit. An
 * envelope the server refused - a bad recipient, a sender it will not relay
 * for - is permanent, and retrying it only teaches the provider that this
 * account sends junk.
 */
export function isPermanent(error: unknown): boolean {
  const e = error as { responseCode?: number; code?: string };
  if (typeof e?.responseCode === 'number') return e.responseCode >= 500;
  if (e?.code === 'EENVELOPE' || e?.code === 'EAUTH') return true;
  return false;
}

@Injectable()
export class TransportService {
  constructor(private readonly settings: EmailSettingsService) {}

  private build(config: TransportConfig): Transporter {
    return createTransport({
      host: config.host,
      port: config.port,
      // nodemailer's `secure` means implicit TLS from the first byte (465).
      // STARTTLS starts in clear and upgrades, so it is `secure: false` with
      // the upgrade required rather than merely offered.
      secure: config.security === 'tls',
      requireTLS: config.security === 'starttls',
      ignoreTLS: config.security === 'none',
      auth: config.username
        ? { user: config.username, pass: config.password ?? '' }
        : undefined,
      connectionTimeout: 15_000,
      greetingTimeout: 10_000,
      socketTimeout: 30_000,
      // Never written to our logs: nodemailer's own logger prints the AUTH
      // exchange when enabled.
      logger: false,
      debug: false,
    });
  }

  private async transporter(): Promise<Transporter> {
    const config = await this.settings.transportConfig();
    if (!config) throw new SmtpNotConfiguredError();
    return this.build(config);
  }

  /** Opens a connection and authenticates, without sending anything. */
  async verify(): Promise<void> {
    const transporter = await this.transporter();
    try {
      await transporter.verify();
    } finally {
      transporter.close();
    }
  }

  async send(email: OutgoingEmail): Promise<{ messageId: string }> {
    // The last line of defence. Everything here has been validated where it
    // was stored, but this is where a header is actually written.
    if (!isPlausibleEmail(email.to))
      throw Object.assign(new Error('Destinataire invalide'), {
        code: 'EENVELOPE',
      });
    if (!isPlausibleEmail(email.fromEmail))
      throw Object.assign(new Error('Expéditeur invalide'), {
        code: 'EENVELOPE',
      });
    if (email.replyTo && !isPlausibleEmail(email.replyTo))
      throw Object.assign(new Error('Adresse de réponse invalide'), {
        code: 'EENVELOPE',
      });
    assertHeaderSafe('subject', email.subject);
    assertHeaderSafe('fromName', email.fromName);
    assertHeaderSafe('toName', email.toName ?? null);

    const transporter = await this.transporter();
    try {
      const info = (await transporter.sendMail({
        from: { name: email.fromName, address: email.fromEmail },
        to: email.toName ? { name: email.toName, address: email.to } : email.to,
        replyTo: email.replyTo ?? undefined,
        subject: email.subject,
        html: email.html,
        text: email.text,
      })) as { messageId: string };
      return { messageId: info.messageId };
    } finally {
      transporter.close();
    }
  }
}
