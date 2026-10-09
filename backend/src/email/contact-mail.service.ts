import { Injectable, Logger } from '@nestjs/common';
import type { ContactMessage } from '@prisma/client';
import { EmailSettingsService } from './email-settings.service';
import { EmailQueueService } from './email-queue.service';
import { TemplatesService } from './templates.service';
import type { Locale } from './render';

export const CONTACT_ACK = 'contact_ack';
export const CONTACT_NOTIFY = 'contact_notify';

/**
 * The two emails a contact request produces.
 *
 * Called only once the request is in the database: an acknowledgement for a
 * message we then failed to store would be a promise nobody can keep. And it
 * only queues - the visitor's response does not wait for SMTP, and if SMTP is
 * down the request is still stored, still visible in the back-office, and
 * both emails go out when it comes back.
 *
 * Neither email subscribes anyone to anything. Writing to the association is
 * not consent to its newsletter, and nothing here touches the subscriber list.
 */
@Injectable()
export class ContactMailService {
  private readonly logger = new Logger(ContactMailService.name);

  constructor(
    private readonly settings: EmailSettingsService,
    private readonly queue: EmailQueueService,
    private readonly templates: TemplatesService,
  ) {}

  async onReceived(
    message: ContactMessage,
    locale: Locale = 'fr',
  ): Promise<void> {
    // Two independent jobs: a broken notification template must not cost the
    // visitor their acknowledgement, or the other way round.
    await Promise.allSettled([
      this.acknowledge(message, locale),
      this.notifyTeam(message),
    ]).then((results) => {
      for (const result of results) {
        if (result.status === 'rejected') {
          // The id only: the visitor's address and message stay out of logs.
          this.logger.error(
            `Could not queue a contact email for ${message.id}: ${String(result.reason)}`,
          );
        }
      }
    });
  }

  private async acknowledge(
    message: ContactMessage,
    locale: Locale,
  ): Promise<void> {
    const template = await this.templates.get(CONTACT_ACK);
    if (!template.isActive) return;

    const email = await this.templates.render(CONTACT_ACK, locale, {
      firstName: firstNameOf(message.name),
      name: message.name,
      subject: message.subject,
    });

    // Unique on (contactMessageId, kind): a retried POST or a second call for
    // the same request stores nothing new.
    await this.queue.enqueue({
      kind: CONTACT_ACK,
      purpose: 'contact',
      to: message.email,
      toName: message.name,
      locale,
      email,
      contactMessageId: message.id,
    });
  }

  private async notifyTeam(message: ContactMessage): Promise<void> {
    const settings = await this.settings.get();
    // No inbox, no email. The request is still in the back-office; the
    // configuration screen says so in its warnings.
    if (!settings.contactInbox) return;

    const template = await this.templates.get(CONTACT_NOTIFY);
    if (!template.isActive) return;

    const site = await this.templates.siteValues();

    // Read by the team, so always French whatever the visitor was reading.
    const email = await this.templates.render(CONTACT_NOTIFY, 'fr', {
      name: message.name,
      email: message.email,
      subject: message.subject,
      message: message.message,
      receivedAt: new Intl.DateTimeFormat('fr-FR', {
        dateStyle: 'long',
        timeStyle: 'short',
        timeZone: 'Africa/Dakar',
      }).format(message.createdAt),
      adminUrl: `${site.siteUrl}/admin/messages?id=${message.id}`,
    });

    await this.queue.enqueue({
      kind: CONTACT_NOTIFY,
      purpose: 'notification',
      to: settings.contactInbox,
      locale: 'fr',
      email,
      // Replying to the notification writes to the visitor - which is what
      // anyone reading it will want to do.
      replyTo: message.email,
      contactMessageId: message.id,
    });
  }
}

/**
 * The first word of what the visitor typed as their name.
 *
 * Names do not split reliably - "Mame Diarra", "El Hadji" - so this is a
 * greeting, not an identification, and a single-word name is used whole.
 */
export function firstNameOf(name: string): string {
  const first = name.trim().split(/\s+/)[0] ?? '';
  return first || name.trim();
}
