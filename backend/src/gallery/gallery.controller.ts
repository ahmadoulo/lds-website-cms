import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GalleryService } from './gallery.service';
import { CreateGalleryAlbumDto } from './dto/create-gallery.dto';
import { UpdateGalleryAlbumDto } from './dto/update-gallery.dto';
import { AddGalleryImageDto, UpdateGalleryImageDto } from './dto/gallery-image.dto';
import { ReorderDto } from '../common/dto/reorder.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedUser } from '../auth/auth.types';

@ApiTags('gallery')
@Controller('gallery')
export class GalleryController {
  constructor(
    private readonly galleryService: GalleryService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'List gallery albums with their images' })
  findAll(@CurrentUser() user?: AuthenticatedUser) {
    return this.galleryService.findAllAlbums(Boolean(user));
  }

  @Get('images')
  @ApiOperation({ summary: 'Flat list of every published gallery image' })
  findImages() {
    return this.galleryService.findPublishedImages();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one album' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.galleryService.findAlbum(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('CREATE', 'GalleryAlbum')
  @ApiOperation({ summary: 'Create an album' })
  async create(@Body() dto: CreateGalleryAlbumDto, @CurrentUser() user: AuthenticatedUser) {
    const album = await this.galleryService.createAlbum(dto);
    await this.audit.record({
      action: 'CREATE',
      resource: 'GalleryAlbum',
      resourceId: album.id,
      userId: user.id,
    });
    return album;
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('UPDATE', 'GalleryAlbum')
  @ApiOperation({ summary: 'Update an album' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGalleryAlbumDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const album = await this.galleryService.updateAlbum(id, dto);
    await this.audit.record({
      action: 'UPDATE',
      resource: 'GalleryAlbum',
      resourceId: id,
      userId: user.id,
    });
    return album;
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('DELETE', 'GalleryAlbum')
  @ApiOperation({ summary: 'Delete an album and its image links' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.galleryService.removeAlbum(id);
    await this.audit.record({
      action: 'DELETE',
      resource: 'GalleryAlbum',
      resourceId: id,
      userId: user.id,
    });
    return result;
  }

  @Post(':id/images')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('UPDATE', 'GalleryAlbum')
  @ApiOperation({ summary: 'Attach an existing media file to an album' })
  addImage(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AddGalleryImageDto) {
    return this.galleryService.addImage(id, dto);
  }

  @Patch(':id/images/reorder')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('UPDATE', 'GalleryAlbum')
  @ApiOperation({ summary: 'Persist a new image order inside an album' })
  reorderImages(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReorderDto) {
    return this.galleryService.reorderImages(id, dto.ids);
  }

  @Patch('images/:imageId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('UPDATE', 'GalleryAlbum')
  @ApiOperation({ summary: 'Update an image caption or position' })
  updateImage(@Param('imageId', ParseUUIDPipe) imageId: string, @Body() dto: UpdateGalleryImageDto) {
    return this.galleryService.updateImage(imageId, dto);
  }

  @Delete('images/:imageId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('UPDATE', 'GalleryAlbum')
  @ApiOperation({ summary: 'Detach an image from its album' })
  removeImage(@Param('imageId', ParseUUIDPipe) imageId: string) {
    return this.galleryService.removeImage(imageId);
  }
}
