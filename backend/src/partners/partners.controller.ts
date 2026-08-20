import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PartnersService } from './partners.service';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';
import { ReorderDto } from '../common/dto/reorder.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedUser } from '../auth/auth.types';

@ApiTags('partners')
@Controller('partners')
export class PartnersController {
  constructor(
    private readonly partnersService: PartnersService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'List partners (drafts included for signed-in staff)' })
  findAll(@CurrentUser() user?: AuthenticatedUser) {
    return this.partnersService.findAll(Boolean(user));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a partner by id' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.partnersService.findOne(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('CREATE', 'Partner')
  @ApiOperation({ summary: 'Create a partner' })
  async create(@Body() dto: CreatePartnerDto, @CurrentUser() user: AuthenticatedUser) {
    const partner = await this.partnersService.create(dto);
    await this.audit.record({ action: 'CREATE', resource: 'Partner', resourceId: partner.id, userId: user.id });
    return partner;
  }

  @Patch('reorder')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('UPDATE', 'Partner')
  @ApiOperation({ summary: 'Persist a new display order' })
  reorder(@Body() dto: ReorderDto) {
    return this.partnersService.reorder(dto.ids);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('UPDATE', 'Partner')
  @ApiOperation({ summary: 'Update a partner' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePartnerDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const partner = await this.partnersService.update(id, dto);
    await this.audit.record({ action: 'UPDATE', resource: 'Partner', resourceId: id, userId: user.id });
    return partner;
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('DELETE', 'Partner')
  @ApiOperation({ summary: 'Delete a partner' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.partnersService.remove(id);
    await this.audit.record({ action: 'DELETE', resource: 'Partner', resourceId: id, userId: user.id });
    return result;
  }
}
