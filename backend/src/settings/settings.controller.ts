import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedUser } from '../auth/auth.types';

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Published site settings' })
  findAll() {
    return this.settingsService.findAll();
  }

  /** What the administration edits: the draft when one exists. */
  @Get('draft')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('READ', 'Settings')
  @ApiOperation({ summary: 'Settings as currently edited, drafts included' })
  findDraft() {
    return this.settingsService.findAllWithMedia('draft');
  }

  @Get('draft/status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('READ', 'Settings')
  @ApiOperation({ summary: 'Which sections have unpublished changes' })
  draftStatus() {
    return this.settingsService.getDraftStatus();
  }

  @Post('publish')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('UPDATE', 'Settings')
  @ApiOperation({ summary: 'Publish every pending section at once' })
  async publishAll(@CurrentUser() user: AuthenticatedUser) {
    const result = await this.settingsService.publishAll();
    await this.audit.record({
      action: 'UPDATE',
      resource: 'SiteSettings',
      userId: user.id,
      metadata: { published: result.published },
    });
    return result;
  }

  @Get(':key')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('READ', 'Settings')
  @ApiOperation({ summary: 'One section, with its draft and publication state' })
  findOne(@Param('key') key: string) {
    return this.settingsService.findOne(key);
  }

  @Patch(':key')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('UPDATE', 'Settings')
  @ApiOperation({ summary: 'Save a section as a draft (not visible publicly)' })
  update(@Param('key') key: string, @Body() dto: UpdateSettingDto) {
    return this.settingsService.update(key, dto);
  }

  @Post(':key/publish')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('UPDATE', 'Settings')
  @ApiOperation({ summary: 'Make the draft of a section visible on the site' })
  async publish(@Param('key') key: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.settingsService.publish(key);
    await this.audit.record({
      action: 'UPDATE',
      resource: 'SiteSettings',
      resourceId: key,
      userId: user.id,
      metadata: { published: true },
    });
    return result;
  }

  @Delete(':key/draft')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('UPDATE', 'Settings')
  @ApiOperation({ summary: 'Throw the draft away and keep what is online' })
  discard(@Param('key') key: string) {
    return this.settingsService.discard(key);
  }
}
