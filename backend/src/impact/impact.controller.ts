import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ImpactService } from './impact.service';
import { CreateImpactDto } from './dto/create-impact.dto';
import { UpdateImpactDto } from './dto/update-impact.dto';
import { ReorderDto } from '../common/dto/reorder.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedUser } from '../auth/auth.types';

@ApiTags('impact')
@Controller('impact')
export class ImpactController {
  constructor(
    private readonly impactService: ImpactService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'List impact statistics' })
  findAll(@CurrentUser() user?: AuthenticatedUser) {
    return this.impactService.findAll(Boolean(user));
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.impactService.findOne(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('CREATE', 'ImpactStatistic')
  async create(@Body() dto: CreateImpactDto, @CurrentUser() user: AuthenticatedUser) {
    const stat = await this.impactService.create(dto);
    await this.audit.record({
      action: 'CREATE',
      resource: 'ImpactStatistic',
      resourceId: stat.id,
      userId: user.id,
    });
    return stat;
  }

  @Patch('reorder')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('UPDATE', 'ImpactStatistic')
  reorder(@Body() dto: ReorderDto) {
    return this.impactService.reorder(dto.ids);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('UPDATE', 'ImpactStatistic')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateImpactDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const stat = await this.impactService.update(id, dto);
    await this.audit.record({
      action: 'UPDATE',
      resource: 'ImpactStatistic',
      resourceId: id,
      userId: user.id,
    });
    return stat;
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('DELETE', 'ImpactStatistic')
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.impactService.remove(id);
    await this.audit.record({
      action: 'DELETE',
      resource: 'ImpactStatistic',
      resourceId: id,
      userId: user.id,
    });
    return result;
  }
}
