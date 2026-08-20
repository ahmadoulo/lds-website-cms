import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedUser } from '../auth/auth.types';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly audit: AuditService,
  ) {}

  @Post()
  @RequirePermission('CREATE', 'User')
  @ApiOperation({ summary: 'Create an account' })
  async create(@Body() dto: CreateUserDto, @CurrentUser() actor: AuthenticatedUser) {
    const user = await this.usersService.create(dto);
    await this.audit.record({
      action: 'CREATE',
      resource: 'User',
      resourceId: user.id,
      userId: actor.id,
      metadata: { email: user.email, role: user.role },
    });
    return user;
  }

  @Get()
  @RequirePermission('READ', 'User')
  @ApiOperation({ summary: 'List all accounts' })
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @RequirePermission('READ', 'User')
  @ApiOperation({ summary: 'Get one account' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('UPDATE', 'User')
  @ApiOperation({ summary: 'Update an account' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const user = await this.usersService.update(id, dto, actor.id);
    await this.audit.record({
      action: 'UPDATE',
      resource: 'User',
      resourceId: id,
      userId: actor.id,
      metadata: { passwordReset: Boolean(dto.password) },
    });
    return user;
  }

  @Delete(':id')
  @RequirePermission('DELETE', 'User')
  @ApiOperation({ summary: 'Deactivate an account (soft delete)' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedUser) {
    const user = await this.usersService.remove(id, actor.id);
    await this.audit.record({ action: 'DELETE', resource: 'User', resourceId: id, userId: actor.id });
    return user;
  }
}
