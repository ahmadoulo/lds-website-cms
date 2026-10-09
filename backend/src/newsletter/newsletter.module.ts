import { Module } from '@nestjs/common';
import { EmailModule } from '../email/email.module';
import { AuditModule } from '../audit/audit.module';
import { NewsletterService } from './newsletter.service';
import {
  NewsletterAdminController,
  NewsletterPublicController,
} from './newsletter.controller';

@Module({
  imports: [EmailModule, AuditModule],
  controllers: [NewsletterPublicController, NewsletterAdminController],
  providers: [NewsletterService],
  exports: [NewsletterService],
})
export class NewsletterModule {}
