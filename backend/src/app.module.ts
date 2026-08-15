import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SettingsModule } from './settings/settings.module';
import { NavigationModule } from './navigation/navigation.module';
import { MissionsModule } from './missions/missions.module';
import { GalleryModule } from './gallery/gallery.module';
import { NewsModule } from './news/news.module';
import { PartnersModule } from './partners/partners.module';
import { ImpactModule } from './impact/impact.module';
import { DonationsModule } from './donations/donations.module';
import { MediaModule } from './media/media.module';
import { ContactModule } from './contact/contact.module';
import { AuditModule } from './audit/audit.module';
import { PublicModule } from './public/public.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    PrismaModule,
    CommonModule,
    AuthModule,
    UsersModule,
    SettingsModule,
    NavigationModule,
    MissionsModule,
    GalleryModule,
    NewsModule,
    PartnersModule,
    ImpactModule,
    DonationsModule,
    MediaModule,
    ContactModule,
    AuditModule,
    PublicModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
