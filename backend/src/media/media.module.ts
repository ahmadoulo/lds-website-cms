import { Module } from '@nestjs/common';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { ImageVariantsService } from './image-variants.service';

@Module({
  controllers: [MediaController],
  providers: [MediaService, ImageVariantsService],
  exports: [MediaService],
})
export class MediaModule {}
