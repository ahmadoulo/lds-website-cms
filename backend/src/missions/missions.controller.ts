import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { MissionsService } from './missions.service';
import { CreateMissionDto } from './dto/create-mission.dto';
import { UpdateMissionDto } from './dto/update-mission.dto';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/require-permission.decorator';

@ApiTags('missions')
@Controller('missions')
export class MissionsController {
  constructor(private readonly missionsService: MissionsService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('CREATE', 'Mission')
  @ApiOperation({ summary: 'Create a new mission' })
  create(@Body() createMissionDto: CreateMissionDto) {
    return this.missionsService.create(createMissionDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all missions' })
  @ApiQuery({ name: 'admin', required: false, type: Boolean })
  findAll(@Query('admin') admin?: boolean) {
    // If not requested by admin view, only return published missions
    const isPublishedOnly = admin !== true;
    return this.missionsService.findAll(isPublishedOnly);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a mission by id' })
  findOne(@Param('id') id: string) {
    return this.missionsService.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('UPDATE', 'Mission')
  @ApiOperation({ summary: 'Update a mission' })
  update(@Param('id') id: string, @Body() updateMissionDto: UpdateMissionDto) {
    return this.missionsService.update(id, updateMissionDto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('DELETE', 'Mission')
  @ApiOperation({ summary: 'Delete a mission' })
  remove(@Param('id') id: string) {
    return this.missionsService.remove(id);
  }
}
