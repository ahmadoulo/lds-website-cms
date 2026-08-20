import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Live content counts' })
  getStats() {
    return this.dashboardService.getStats();
  }

  @Get('overview')
  @ApiOperation({ summary: 'Recent articles, unread messages and admin activity' })
  getOverview() {
    return this.dashboardService.getOverview();
  }

  @Get('health')
  @ApiOperation({ summary: 'Database and object storage connectivity' })
  getHealth() {
    return this.dashboardService.getHealth();
  }
}
