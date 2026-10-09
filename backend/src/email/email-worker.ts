import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { EmailQueueService } from './email-queue.service';

/** How often the queue is looked at. */
export const TICK_MS = 15_000;

/**
 * Drains the queue in the background, independently of any request.
 *
 * A campaign or an acknowledgement keeps going after the administrator closes
 * the tab, and after the API restarts: the queue is rows in PostgreSQL, so the
 * work is wherever the database is, not in this process's memory.
 *
 * A plain interval rather than @nestjs/schedule. That package's current major
 * ships as ES modules only, which the CommonJS build of this API can load only
 * on some Node versions, and Jest not at all - a dependency with that risk was
 * not worth it for one timer.
 */
@Injectable()
export class EmailWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmailWorker.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(private readonly queue: EmailQueueService) {}

  onModuleInit(): void {
    // Not under test, and not when an operator has switched it off - for
    // example to run a second API container that should serve but not send.
    if (
      process.env.NODE_ENV === 'test' ||
      process.env.EMAIL_WORKER_DISABLED === 'true'
    )
      return;

    this.timer = setInterval(() => void this.tick(), TICK_MS);
    // Never the reason the process stays alive at shutdown.
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /**
   * At most one pass at a time.
   *
   * A pass still sending a batch when the next tick fires is left to finish.
   * SKIP LOCKED would keep a second pass from taking the same rows anyway, but
   * there is no reason to open a second SMTP connection to compete with the
   * first.
   */
  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.queue.processBatch();
    } catch (error) {
      // Never rethrown: a failed pass must not stop the next one.
      this.logger.error(
        `Email queue pass failed: ${String((error as Error)?.message ?? error)}`,
      );
    } finally {
      this.running = false;
    }
  }
}
