import { Module } from '@nestjs/common';
import { SeoController } from './seo.controller';
import { SeoService } from './seo.service';
import { PageMetaService } from './page-meta.service';
import { PageShellService } from './page-shell.service';

@Module({
  controllers: [SeoController],
  providers: [SeoService, PageMetaService, PageShellService],
})
export class SeoModule {}
