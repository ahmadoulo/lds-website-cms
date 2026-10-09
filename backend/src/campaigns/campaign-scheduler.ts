import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { CampaignsService } from './campaigns.service';

const TICK_MS = 30_000;

/**
 * Starts scheduled campaigns, finishes interrupted enqueues, and closes
 * campaigns that have nothing left to send.
 *
 * Separate from the email worker, which only ever sends what is queued: this
 * decides what gets queued. Both are plain intervals for the same reason, and
 * both survive a restart because their state is in the database.
 */
@Injectable()
export class CampaignScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CampaignScheduler.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(private readonly campaigns: CampaignsService) {}

  onModuleInit(): void {
    if (
      process.env.NODE_ENV === 'test' ||
      process.env.EMAIL_WORKER_DISABLED === 'true'
    )
      return;
    this.timer = setInterval(() => void this.tick(), TICK_MS);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.campaigns.startDue();
      await this.campaigns.resumeEnqueues();
      await this.campaigns.completeFinished();
    } catch (error) {
      this.logger.error(
        `Campaign pass failed: ${String((error as Error)?.message ?? error)}`,
      );
    } finally {
      this.running = false;
    }
  }
}
