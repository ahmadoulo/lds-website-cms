import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGalleryAlbumDto } from './dto/create-gallery.dto';
import { UpdateGalleryAlbumDto } from './dto/update-gallery.dto';
import { AddGalleryImageDto, UpdateGalleryImageDto } from './dto/gallery-image.dto';

const ALBUM_INCLUDE = {
  images: {
    orderBy: [{ order: 'asc' as const }, { createdAt: 'asc' as const }],
    include: { media: true },
  },
};

@Injectable()
export class GalleryService {
  constructor(private prisma: PrismaService) {}

  // ---------------------------------------------------------------- albums

  async createAlbum(dto: CreateGalleryAlbumDto) {
    const order = dto.order ?? (await this.nextAlbumOrder());
    return this.prisma.galleryAlbum.create({
      data: { ...dto, order },
      include: ALBUM_INCLUDE,
    });
  }

  async findAllAlbums(includeUnpublished = false) {
    return this.prisma.galleryAlbum.findMany({
      where: includeUnpublished ? undefined : { isPublished: true },
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      include: ALBUM_INCLUDE,
    });
  }

  async findAlbum(id: string) {
    const album = await this.prisma.galleryAlbum.findUnique({
      where: { id },
      include: ALBUM_INCLUDE,
    });
    if (!album) throw new NotFoundException('Album introuvable');
    return album;
  }

  async updateAlbum(id: string, dto: UpdateGalleryAlbumDto) {
    await this.findAlbum(id);
    return this.prisma.galleryAlbum.update({
      where: { id },
      data: dto,
      include: ALBUM_INCLUDE,
    });
  }

  async removeAlbum(id: string) {
    await this.findAlbum(id);
    // GalleryImage rows cascade; the underlying Media files stay in the library
    // so they can be reused elsewhere.
    await this.prisma.galleryAlbum.delete({ where: { id } });
    return { success: true, id };
  }

  // ---------------------------------------------------------------- images

  /** Flat, chronological list of published images - what the public gallery renders. */
  async findPublishedImages(limit?: number) {
    return this.prisma.galleryImage.findMany({
      where: { album: { isPublished: true } },
      orderBy: [{ album: { order: 'asc' } }, { order: 'asc' }, { createdAt: 'desc' }],
      take: limit,
      include: { media: true, album: { select: { id: true, title: true } } },
    });
  }

  async addImage(albumId: string, dto: AddGalleryImageDto) {
    await this.findAlbum(albumId);

    const media = await this.prisma.media.findUnique({ where: { id: dto.mediaId } });
    if (!media) throw new NotFoundException('Média introuvable');

    const order = dto.order ?? (await this.nextImageOrder(albumId));

    return this.prisma.galleryImage.create({
      data: { albumId, mediaId: dto.mediaId, caption: dto.caption, order },
      include: { media: true },
    });
  }

  async updateImage(imageId: string, dto: UpdateGalleryImageDto) {
    const image = await this.prisma.galleryImage.findUnique({ where: { id: imageId } });
    if (!image) throw new NotFoundException('Image introuvable');

    return this.prisma.galleryImage.update({
      where: { id: imageId },
      data: dto,
      include: { media: true },
    });
  }

  async removeImage(imageId: string) {
    const image = await this.prisma.galleryImage.findUnique({ where: { id: imageId } });
    if (!image) throw new NotFoundException('Image introuvable');

    await this.prisma.galleryImage.delete({ where: { id: imageId } });
    return { success: true, id: imageId };
  }

  async reorderImages(albumId: string, ids: string[]) {
    await this.findAlbum(albumId);
    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.galleryImage.update({ where: { id }, data: { order: index } }),
      ),
    );
    return this.findAlbum(albumId);
  }

  // --------------------------------------------------------------- helpers

  private async nextAlbumOrder() {
    const last = await this.prisma.galleryAlbum.findFirst({
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    return (last?.order ?? -1) + 1;
  }

  private async nextImageOrder(albumId: string) {
    const last = await this.prisma.galleryImage.findFirst({
      where: { albumId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    return (last?.order ?? -1) + 1;
  }
}
