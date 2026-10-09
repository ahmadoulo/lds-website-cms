import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { AuditModule } from '../audit/audit.module';
import { EmailController } from './email.controller';
import { EmailSettingsService } from './email-settings.service';
import { TransportService } from './transport.service';
import { TemplatesService } from './templates.service';
import { EmailQueueService } from './email-queue.service';
import { EmailHistoryService } from './email-history.service';
import { EmailWorker } from './email-worker';
import { ContactMailService } from './contact-mail.service';
import { DnsCheckService } from './dns-check.service';

@Module({
  imports: [SettingsModule, AuditModule],
  controllers: [EmailController],
  providers: [
    EmailSettingsService,
    TransportService,
    TemplatesService,
    EmailQueueService,
    EmailHistoryService,
    EmailWorker,
    ContactMailService,
    DnsCheckService,
  ],
  exports: [
    ContactMailService,
    EmailQueueService,
    TemplatesService,
    EmailSettingsService,
  ],
})
export class EmailModule {}
