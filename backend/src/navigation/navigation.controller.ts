import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NavigationService } from './navigation.service';
import { CreateNavigationDto } from './dto/create-navigation.dto';
import { UpdateNavigationDto } from './dto/update-navigation.dto';
import { ReorderDto } from '../common/dto/reorder.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedUser } from '../auth/auth.types';

@ApiTags('navigation')
@Controller('navigation')
export class NavigationController {
  constructor(
    private readonly navigationService: NavigationService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get the public navigation tree' })
  findAll() {
    return this.navigationService.findTree();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.navigationService.findOne(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('CREATE', 'NavigationItem')
  async create(@Body() dto: CreateNavigationDto, @CurrentUser() user: AuthenticatedUser) {
    const item = await this.navigationService.create(dto);
    await this.audit.record({
      action: 'CREATE',
      resource: 'NavigationItem',
      resourceId: item.id,
      userId: user.id,
    });
    return item;
  }

  @Patch('reorder')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('UPDATE', 'NavigationItem')
  reorder(@Body() dto: ReorderDto) {
    return this.navigationService.reorder(dto.ids);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('UPDATE', 'NavigationItem')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateNavigationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const item = await this.navigationService.update(id, dto);
    await this.audit.record({
      action: 'UPDATE',
      resource: 'NavigationItem',
      resourceId: id,
      userId: user.id,
    });
    return item;
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('DELETE', 'NavigationItem')
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.navigationService.remove(id);
    await this.audit.record({
      action: 'DELETE',
      resource: 'NavigationItem',
      resourceId: id,
      userId: user.id,
    });
    return result;
  }
}
