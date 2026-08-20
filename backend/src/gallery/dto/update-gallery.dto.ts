import { PartialType } from '@nestjs/swagger';
import { CreateGalleryAlbumDto } from './create-gallery.dto';

export class UpdateGalleryAlbumDto extends PartialType(CreateGalleryAlbumDto) {}
