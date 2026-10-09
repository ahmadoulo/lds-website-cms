import { Module } from '@nestjs/common';
import { EmailModule } from '../email/email.module';
import { NewsletterModule } from '../newsletter/newsletter.module';
import { AuditModule } from '../audit/audit.module';
import { CampaignsService } from './campaigns.service';
import { CampaignsController } from './campaigns.controller';
import { CampaignScheduler } from './campaign-scheduler';

@Module({
  imports: [EmailModule, NewsletterModule, AuditModule],
  controllers: [CampaignsController],
  providers: [CampaignsService, CampaignScheduler],
})
export class CampaignsModule {}
