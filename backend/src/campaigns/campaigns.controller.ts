import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import { resolvePublicApiUrl } from '../common/media-url.interceptor';
import { normaliseSiteUrl } from '../common/site-url';
import { CampaignsService } from './campaigns.service';
import {
  AudienceDto,
  CampaignDto,
  CampaignTestDto,
  ListDto,
  ScheduleDto,
} from './dto/campaign.dto';

/** A signed-in administrator's own origin: every route here is guarded. */
const adminOrigin = (request: Request) =>
  normaliseSiteUrl(resolvePublicApiUrl(request));

@ApiTags('campaigns')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('campaigns')
export class CampaignsController {
  constructor(
    private readonly campaigns: CampaignsService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @RequirePermission('READ', 'Campaign')
  list(@Query() query: ListDto) {
    return this.campaigns.list(query.page, query.limit);
  }

  @Post('audience')
  @HttpCode(200)
  @RequirePermission('READ', 'Campaign')
  @ApiOperation({
    summary: 'How many confirmed subscribers an audience reaches right now',
  })
  async audience(@Body() dto: AudienceDto) {
    return { recipients: await this.campaigns.countAudience(dto) };
  }

  /** Renders unsaved content, so the editor can preview before saving. */
  @Post('preview')
  @HttpCode(200)
  @RequirePermission('READ', 'Campaign')
  previewDraft(@Body() dto: CampaignDto, @Req() request: Request) {
    return this.campaigns.preview(null, dto, adminOrigin(request));
  }

  @Get(':id')
  @RequirePermission('READ', 'Campaign')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.campaigns.get(id);
  }

  @Get(':id/stats')
  @RequirePermission('READ', 'Campaign')
  stats(@Param('id', ParseUUIDPipe) id: string) {
    return this.campaigns.stats(id);
  }

  @Post()
  @RequirePermission('CREATE', 'Campaign')
  async create(
    @Body() dto: CampaignDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const campaign = await this.campaigns.create(dto, user.id);
    await this.record('CREATE', campaign.id, user);
    return campaign;
  }

  @Put(':id')
  @RequirePermission('UPDATE', 'Campaign')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CampaignDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const campaign = await this.campaigns.update(id, dto);
    await this.record('UPDATE', id, user);
    return campaign;
  }

  @Post(':id/duplicate')
  @RequirePermission('CREATE', 'Campaign')
  async duplicate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const campaign = await this.campaigns.duplicate(id, user.id);
    await this.record('CREATE', campaign.id, user, { duplicateOf: id });
    return campaign;
  }

  @Delete(':id')
  @RequirePermission('DELETE', 'Campaign')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.campaigns.remove(id);
    await this.record('DELETE', id, user);
    return { ok: true };
  }

  @Post(':id/preview')
  @HttpCode(200)
  @RequirePermission('READ', 'Campaign')
  preview(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CampaignDto,
    @Req() request: Request,
  ) {
    return this.campaigns.preview(id, dto, adminOrigin(request));
  }

  @Post(':id/test')
  @HttpCode(200)
  @RequirePermission('UPDATE', 'Campaign')
  async test(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CampaignTestDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    const result = await this.campaigns.sendTest(
      id,
      dto.to,
      adminOrigin(request),
    );
    await this.record('CREATE', id, user, { test: true, ok: result.ok });
    return result;
  }

  @Post(':id/schedule')
  @HttpCode(200)
  @RequirePermission('UPDATE', 'Campaign')
  async schedule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ScheduleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const campaign = await this.campaigns.schedule(
      id,
      dto.at ? new Date(dto.at) : null,
      dto.expectedRecipients,
    );
    await this.record('UPDATE', id, user, {
      sent: campaign.status === 'SENDING',
      scheduledAt: campaign.scheduledAt,
      recipients: dto.expectedRecipients,
    });
    return campaign;
  }

  @Post(':id/pause')
  @HttpCode(200)
  @RequirePermission('UPDATE', 'Campaign')
  async pause(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const campaign = await this.campaigns.pause(id);
    await this.record('UPDATE', id, user, { paused: true });
    return campaign;
  }

  @Post(':id/resume')
  @HttpCode(200)
  @RequirePermission('UPDATE', 'Campaign')
  async resume(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const campaign = await this.campaigns.resume(id);
    await this.record('UPDATE', id, user, { resumed: true });
    return campaign;
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @RequirePermission('UPDATE', 'Campaign')
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const campaign = await this.campaigns.cancel(id);
    await this.record('UPDATE', id, user, { cancelled: true });
    return campaign;
  }

  private record(
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    id: string,
    user: AuthenticatedUser,
    metadata?: Record<string, unknown>,
  ) {
    return this.audit.record({
      action,
      resource: 'Campaign',
      resourceId: id,
      userId: user.id,
      metadata,
    });
  }
}
