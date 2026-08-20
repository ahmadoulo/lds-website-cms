import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { MissionsModule } from '../missions/missions.module';
import { NewsModule } from '../news/news.module';
import { GalleryModule } from '../gallery/gallery.module';
import { ImpactModule } from '../impact/impact.module';
import { PartnersModule } from '../partners/partners.module';
import { DonationsModule } from '../donations/donations.module';
import { SettingsModule } from '../settings/settings.module';
import { NavigationModule } from '../navigation/navigation.module';

@Module({
  imports: [
    MissionsModule,
    NewsModule,
    GalleryModule,
    ImpactModule,
    PartnersModule,
    DonationsModule,
    SettingsModule,
    NavigationModule,
  ],
  controllers: [PublicController],
})
export class PublicModule {}
