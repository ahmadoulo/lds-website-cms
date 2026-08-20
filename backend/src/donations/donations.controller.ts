import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DonationsService } from './donations.service';
import { CreateDonationDto } from './dto/create-donation.dto';
import { UpdateDonationDto } from './dto/update-donation.dto';
import { ReorderDto } from '../common/dto/reorder.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedUser } from '../auth/auth.types';

@ApiTags('donations')
@Controller('donations')
export class DonationsController {
  constructor(
    private readonly donationsService: DonationsService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'List the ways to support the association' })
  findAll(@CurrentUser() user?: AuthenticatedUser) {
    return this.donationsService.findAll(Boolean(user));
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.donationsService.findOne(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('CREATE', 'Donation')
  async create(@Body() dto: CreateDonationDto, @CurrentUser() user: AuthenticatedUser) {
    const method = await this.donationsService.create(dto);
    await this.audit.record({ action: 'CREATE', resource: 'Donation', resourceId: method.id, userId: user.id });
    return method;
  }

  @Patch('reorder')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('UPDATE', 'Donation')
  reorder(@Body() dto: ReorderDto) {
    return this.donationsService.reorder(dto.ids);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('UPDATE', 'Donation')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDonationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const method = await this.donationsService.update(id, dto);
    await this.audit.record({ action: 'UPDATE', resource: 'Donation', resourceId: id, userId: user.id });
    return method;
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('DELETE', 'Donation')
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.donationsService.remove(id);
    await this.audit.record({ action: 'DELETE', resource: 'Donation', resourceId: id, userId: user.id });
    return result;
  }
}
