import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { SkipThrottle } from '@nestjs/throttler';
import { MediaService, MAX_FILE_SIZE } from './media.service';
import { QueryMediaDto } from './dto/query-media.dto';
import { UpdateMediaDto } from './dto/update-media.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedUser } from '../auth/auth.types';

@ApiTags('media')
@Controller('media')
export class MediaController {
  constructor(
    private readonly mediaService: MediaService,
    private readonly audit: AuditService,
  ) {}

  @Post('upload')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('CREATE', 'Media')
  @ApiOperation({ summary: 'Upload an image to MinIO and register its metadata' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        folder: { type: 'string' },
        altText: { type: 'string' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE, files: 1 } }))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
    @Body('folder') folder?: string,
    @Body('altText') altText?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }
    const media = await this.mediaService.upload(file, folder, altText);
    await this.audit.record({
      action: 'CREATE',
      resource: 'Media',
      resourceId: media.id,
      userId: user.id,
      metadata: { originalName: media.originalName, size: media.size },
    });
    return media;
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('READ', 'Media')
  @ApiOperation({ summary: 'Browse the media library (paginated)' })
  findAll(@Query() query: QueryMediaDto) {
    return this.mediaService.findAll(query);
  }

  @Get('folders')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('READ', 'Media')
  @ApiOperation({ summary: 'List folders with their file counts' })
  listFolders() {
    return this.mediaService.listFolders();
  }

  /**
   * Public read endpoint. MinIO stays on the private network and every image on
   * the site is streamed through here, so no storage credentials or bucket URLs
   * ever reach the browser.
   */
  @Get(':id/file')
  // A gallery page loads dozens of images at once; the global limit would fire.
  @SkipThrottle()
  @ApiOperation({ summary: 'Stream the binary of a media file' })
  async streamFile(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    const { media, stream } = await this.mediaService.getStream(id);

    res.setHeader('Content-Type', media.mimeType);
    res.setHeader('Content-Length', media.size);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    stream.on('error', () => {
      if (!res.headersSent) res.status(500);
      res.end();
    });
    stream.pipe(res);
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('READ', 'Media')
  @ApiOperation({ summary: 'Get media metadata' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.mediaService.findOne(id);
  }

  @Get(':id/usage')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('READ', 'Media')
  @ApiOperation({ summary: 'Where this file is currently used' })
  usage(@Param('id', ParseUUIDPipe) id: string) {
    return this.mediaService.countUsage(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('UPDATE', 'Media')
  @ApiOperation({ summary: 'Update the alt text of a media file' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateMediaDto) {
    return this.mediaService.updateAltText(id, dto.altText);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('DELETE', 'Media')
  @ApiOperation({ summary: 'Delete a media file from MinIO and the database' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.mediaService.remove(id);
    await this.audit.record({ action: 'DELETE', resource: 'Media', resourceId: id, userId: user.id });
    return result;
  }
}
