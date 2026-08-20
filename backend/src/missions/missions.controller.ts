import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MissionsService } from './missions.service';
import { CreateMissionDto } from './dto/create-mission.dto';
import { UpdateMissionDto } from './dto/update-mission.dto';
import { ReorderDto } from '../common/dto/reorder.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedUser } from '../auth/auth.types';

@ApiTags('missions')
@Controller('missions')
export class MissionsController {
  constructor(
    private readonly missionsService: MissionsService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'List missions (drafts included for signed-in staff)' })
  findAll(@CurrentUser() user?: AuthenticatedUser) {
    return this.missionsService.findAll(Boolean(user));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a mission by id' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.missionsService.findOne(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('CREATE', 'Mission')
  @ApiOperation({ summary: 'Create a mission' })
  async create(@Body() dto: CreateMissionDto, @CurrentUser() user: AuthenticatedUser) {
    const mission = await this.missionsService.create(dto);
    await this.audit.record({ action: 'CREATE', resource: 'Mission', resourceId: mission.id, userId: user.id });
    return mission;
  }

  @Patch('reorder')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('UPDATE', 'Mission')
  @ApiOperation({ summary: 'Persist a new display order' })
  reorder(@Body() dto: ReorderDto) {
    return this.missionsService.reorder(dto.ids);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('UPDATE', 'Mission')
  @ApiOperation({ summary: 'Update a mission' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMissionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const mission = await this.missionsService.update(id, dto);
    await this.audit.record({ action: 'UPDATE', resource: 'Mission', resourceId: id, userId: user.id });
    return mission;
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('DELETE', 'Mission')
  @ApiOperation({ summary: 'Delete a mission' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.missionsService.remove(id);
    await this.audit.record({ action: 'DELETE', resource: 'Mission', resourceId: id, userId: user.id });
    return result;
  }
}
