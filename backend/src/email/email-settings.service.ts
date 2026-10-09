import { BadRequestException, Injectable } from '@nestjs/common';
import type { EmailSettings } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  hasEncryptionKey,
  open,
  redact,
  seal,
  SecretKeyMissingError,
} from './secret-box';
import { assertHeaderSafe, isPlausibleEmail } from './render';

/** What a message is for. Each can carry its own display identity. */
export type Purpose = 'default' | 'contact' | 'notification' | 'newsletter';

export const PURPOSES: readonly Purpose[] = [
  'default',
  'contact',
  'notification',
  'newsletter',
];

export interface Identity {
  fromName: string;
  fromEmail: string;
  replyTo: string | null;
}

/** The settings as the administration may see them: never the password. */
export interface PublicEmailSettings {
  enabled: boolean;
  host: string | null;
  port: number | null;
  security: 'tls' | 'starttls' | 'none';
  username: string | null;
  /** Whether a password is stored. The value itself never leaves the API. */
  hasPassword: boolean;
  fromName: string | null;
  fromEmail: string | null;
  replyToName: string | null;
  replyToEmail: string | null;
  contactInbox: string | null;
  adminInbox: string | null;
  identities: Partial<Record<Purpose, Partial<Identity>>>;
  batchSize: number;
  ratePerMinute: number;
  lastTestAt: Date | null;
  lastTestOk: boolean | null;
  lastTestError: string | null;
  /** Whether the server can store a password at all. */
  encryptionReady: boolean;
  /** Things that will not stop a send but may stop it arriving. */
  warnings: string[];
}

export interface TransportConfig {
  host: string;
  port: number;
  security: 'tls' | 'starttls' | 'none';
  username: string | null;
  password: string | null;
}

export interface EmailSettingsInput {
  enabled?: boolean;
  host?: string | null;
  port?: number | null;
  security?: 'tls' | 'starttls' | 'none';
  username?: string | null;
  /**
   * undefined keeps the stored password; '' removes it; anything else replaces
   * it. The form never receives the current value, so "unchanged" has to be
   * expressible without sending it back.
   */
  password?: string;
  fromName?: string | null;
  fromEmail?: string | null;
  replyToName?: string | null;
  replyToEmail?: string | null;
  contactInbox?: string | null;
  adminInbox?: string | null;
  identities?: Partial<Record<Purpose, Partial<Identity>>> | null;
  batchSize?: number;
  ratePerMinute?: number;
}

const ROW = 'default';

const domainOf = (address: string | null | undefined) =>
  address?.split('@')[1]?.toLowerCase() ?? null;

@Injectable()
export class EmailSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  private async row(): Promise<EmailSettings | null> {
    return this.prisma.emailSettings.findUnique({ where: { id: ROW } });
  }

  async get(): Promise<PublicEmailSettings> {
    return this.present(await this.row());
  }

  /** Only ever called inside the API, by the transport. */
  async transportConfig(): Promise<TransportConfig | null> {
    const row = await this.row();
    if (!row?.host || !row.port) return null;

    return {
      host: row.host,
      port: row.port,
      security: (row.security as TransportConfig['security']) ?? 'starttls',
      username: row.username,
      password: row.passwordCipher ? open(row.passwordCipher) : null,
    };
  }

  async isEnabled(): Promise<boolean> {
    const row = await this.row();
    return Boolean(row?.enabled && row.host && row.port);
  }

  async update(input: EmailSettingsInput): Promise<PublicEmailSettings> {
    const current = await this.row();

    // Every address that will be written into a header is checked here, at
    // the one place it can be stored, rather than at every place it is read.
    for (const field of [
      'fromEmail',
      'replyToEmail',
      'contactInbox',
      'adminInbox',
    ] as const) {
      const value = input[field];
      if (
        value !== undefined &&
        value !== null &&
        value !== '' &&
        !isPlausibleEmail(value)
      ) {
        throw new BadRequestException(`Adresse invalide : ${field}`);
      }
    }
    for (const field of [
      'fromName',
      'replyToName',
      'host',
      'username',
    ] as const) {
      const value = input[field];
      try {
        assertHeaderSafe(field, value ?? null);
      } catch {
        throw new BadRequestException(`Valeur invalide : ${field}`);
      }
    }
    if (input.identities) this.assertIdentities(input.identities);

    if (input.port !== undefined && input.port !== null) {
      if (
        !Number.isInteger(input.port) ||
        input.port < 1 ||
        input.port > 65535
      ) {
        throw new BadRequestException('Port invalide');
      }
    }

    let passwordCipher: string | null | undefined;
    if (input.password === '') passwordCipher = null;
    else if (input.password !== undefined) {
      if (!hasEncryptionKey()) {
        // Refused rather than stored in clear. Saying exactly what is missing
        // is the difference between a five-minute fix and a support ticket.
        throw new BadRequestException(new SecretKeyMissingError().message);
      }
      passwordCipher = seal(input.password);
    }

    const next = {
      enabled: input.enabled ?? current?.enabled ?? false,
      host: blankToNull(input.host, current?.host),
      port: input.port === undefined ? (current?.port ?? null) : input.port,
      security: input.security ?? current?.security ?? 'starttls',
      username: blankToNull(input.username, current?.username),
      fromName: blankToNull(input.fromName, current?.fromName),
      fromEmail: blankToNull(input.fromEmail, current?.fromEmail),
      replyToName: blankToNull(input.replyToName, current?.replyToName),
      replyToEmail: blankToNull(input.replyToEmail, current?.replyToEmail),
      contactInbox: blankToNull(input.contactInbox, current?.contactInbox),
      adminInbox: blankToNull(input.adminInbox, current?.adminInbox),
      identities:
        input.identities === undefined
          ? (current?.identities ?? undefined)
          : (input.identities ?? undefined),
      batchSize: clamp(input.batchSize ?? current?.batchSize ?? 20, 1, 200),
      ratePerMinute: clamp(
        input.ratePerMinute ?? current?.ratePerMinute ?? 60,
        1,
        1000,
      ),
      ...(passwordCipher !== undefined ? { passwordCipher } : {}),
    };

    // A switch that turns sending on must not be accepted for a configuration
    // that cannot send: the visitor would be told their message was
    // acknowledged by an email that is never going to leave.
    if (next.enabled && (!next.host || !next.port || !next.fromEmail)) {
      throw new BadRequestException(
        "L'envoi ne peut pas être activé sans serveur, port et adresse d'expédition.",
      );
    }

    // Any change to how we connect makes the last test meaningless.
    const connectionChanged =
      next.host !== current?.host ||
      next.port !== current?.port ||
      next.security !== current?.security ||
      next.username !== current?.username ||
      passwordCipher !== undefined;

    const row = await this.prisma.emailSettings.upsert({
      where: { id: ROW },
      create: { id: ROW, ...next },
      update: {
        ...next,
        ...(connectionChanged
          ? { lastTestAt: null, lastTestOk: null, lastTestError: null }
          : {}),
      },
    });

    return this.present(row);
  }

  async recordTest(ok: boolean, error: unknown): Promise<void> {
    const config = await this.transportConfig().catch(() => null);
    await this.prisma.emailSettings.upsert({
      where: { id: ROW },
      create: { id: ROW, lastTestAt: new Date(), lastTestOk: ok },
      update: {
        lastTestAt: new Date(),
        lastTestOk: ok,
        lastTestError: error
          ? redact(String((error as Error)?.message ?? error), [
              config?.password,
              config?.username,
            ])
          : null,
      },
    });
  }

  /**
   * Who a message appears to come from.
   *
   * The purpose's own identity first, then the global one, then the SMTP
   * login itself. The address only ever falls back towards the account that
   * is authenticated - a purpose can rename the sender, but it can only
   * change the address to one the administrator has typed in, never to
   * something derived from user input.
   */
  async identityFor(purpose: Purpose): Promise<Identity> {
    const row = await this.row();
    const overrides = (row?.identities ?? {}) as Partial<
      Record<Purpose, Partial<Identity>>
    >;
    const own = purpose === 'default' ? {} : (overrides[purpose] ?? {});

    const fromEmail = own.fromEmail || row?.fromEmail || row?.username || '';
    const fromName =
      own.fromName || row?.fromName || 'Louga Développement Solidaire';
    const replyTo = own.replyTo || row?.replyToEmail || null;

    return { fromName, fromEmail, replyTo };
  }

  private present(row: EmailSettings | null): PublicEmailSettings {
    const identities = (row?.identities ??
      {}) as PublicEmailSettings['identities'];

    return {
      enabled: row?.enabled ?? false,
      host: row?.host ?? null,
      port: row?.port ?? null,
      security:
        (row?.security as PublicEmailSettings['security']) ?? 'starttls',
      username: row?.username ?? null,
      hasPassword: Boolean(row?.passwordCipher),
      fromName: row?.fromName ?? null,
      fromEmail: row?.fromEmail ?? null,
      replyToName: row?.replyToName ?? null,
      replyToEmail: row?.replyToEmail ?? null,
      contactInbox: row?.contactInbox ?? null,
      adminInbox: row?.adminInbox ?? null,
      identities,
      batchSize: row?.batchSize ?? 20,
      ratePerMinute: row?.ratePerMinute ?? 60,
      lastTestAt: row?.lastTestAt ?? null,
      lastTestOk: row?.lastTestOk ?? null,
      lastTestError: row?.lastTestError ?? null,
      encryptionReady: hasEncryptionKey(),
      warnings: this.warnings(row, identities),
    };
  }

  /**
   * Deliverability problems that are visible from the configuration alone.
   *
   * Nothing here can see DNS - SPF, DKIM and DMARC are checked by the
   * receiving server against records this application does not control. What
   * it can see is the configuration most likely to fail them.
   */
  private warnings(
    row: EmailSettings | null,
    identities: PublicEmailSettings['identities'],
  ): string[] {
    const found: string[] = [];
    if (!row) return found;

    const login = domainOf(row.username);
    const senders = [
      row.fromEmail,
      ...Object.values(identities).map((i) => i?.fromEmail),
    ].filter((value): value is string => Boolean(value));

    for (const sender of new Set(senders)) {
      const domain = domainOf(sender);
      if (login && domain && domain !== login) {
        found.push(
          `L'adresse ${sender} n'est pas sur le même domaine que le compte SMTP (${login}). ` +
            'Le fournisseur peut la refuser ou la remplacer, et les messages risquent de ' +
            'finir en indésirables si SPF et DKIM ne couvrent pas ce domaine.',
        );
      }
      if (
        domain &&
        /^(gmail|yahoo|hotmail|outlook|live|icloud)\./.test(domain) &&
        domain !== login
      ) {
        found.push(
          `${sender} est une adresse de messagerie gratuite. Envoyer en son nom depuis un ` +
            'autre serveur échoue presque toujours à DMARC.',
        );
      }
    }

    if (row.security === 'none') {
      found.push(
        'La connexion SMTP n’est pas chiffrée : le mot de passe circule en clair sur le réseau.',
      );
    }
    if (row.enabled && !row.lastTestOk) {
      found.push(
        "L'envoi est activé mais la configuration n'a pas été testée avec succès.",
      );
    }
    if (!row.contactInbox) {
      found.push(
        "Aucune adresse de réception n'est définie : les demandes de contact ne seront " +
          'notifiées à personne par email (elles restent visibles dans le back-office).',
      );
    }

    return [...new Set(found)];
  }

  private assertIdentities(
    identities: Partial<Record<Purpose, Partial<Identity>>>,
  ): void {
    for (const [purpose, identity] of Object.entries(identities)) {
      if (!PURPOSES.includes(purpose as Purpose)) {
        throw new BadRequestException(`Usage inconnu : ${purpose}`);
      }
      if (!identity) continue;
      if (identity.fromEmail && !isPlausibleEmail(identity.fromEmail)) {
        throw new BadRequestException(`Adresse invalide pour ${purpose}`);
      }
      if (identity.replyTo && !isPlausibleEmail(identity.replyTo)) {
        throw new BadRequestException(
          `Adresse de réponse invalide pour ${purpose}`,
        );
      }
      try {
        assertHeaderSafe('fromName', identity.fromName ?? null);
      } catch {
        throw new BadRequestException(
          `Nom d'expéditeur invalide pour ${purpose}`,
        );
      }
    }
  }
}

function blankToNull(
  value: string | null | undefined,
  fallback: string | null | undefined,
): string | null {
  if (value === undefined) return fallback ?? null;
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}
