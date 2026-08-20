import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NewsService } from './news.service';
import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';
import { QueryNewsDto } from './dto/query-news.dto';
import { CreateNewsCategoryDto, UpdateNewsCategoryDto } from './dto/news-category.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedUser } from '../auth/auth.types';

@ApiTags('news')
@Controller('news')
export class NewsController {
  constructor(
    private readonly newsService: NewsService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'List articles (drafts included for signed-in staff)' })
  findAll(@Query() query: QueryNewsDto, @CurrentUser() user?: AuthenticatedUser) {
    return this.newsService.findAll(query, Boolean(user));
  }

  @Get('categories')
  @ApiOperation({ summary: 'List article categories' })
  findCategories() {
    return this.newsService.findCategories();
  }

  @Post('categories')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('CREATE', 'NewsCategory')
  @ApiOperation({ summary: 'Create a category' })
  createCategory(@Body() dto: CreateNewsCategoryDto) {
    return this.newsService.createCategory(dto);
  }

  @Patch('categories/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('UPDATE', 'NewsCategory')
  @ApiOperation({ summary: 'Update a category' })
  updateCategory(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateNewsCategoryDto) {
    return this.newsService.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('DELETE', 'NewsCategory')
  @ApiOperation({ summary: 'Delete a category' })
  removeCategory(@Param('id', ParseUUIDPipe) id: string) {
    return this.newsService.removeCategory(id);
  }

  @Get(':idOrSlug')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get one article by id or slug' })
  findOne(@Param('idOrSlug') idOrSlug: string, @CurrentUser() user?: AuthenticatedUser) {
    return this.newsService.findOne(idOrSlug, Boolean(user));
  }

  @Get(':id/related')
  @ApiOperation({ summary: 'Other published articles to suggest after this one' })
  findRelated(@Param('id') id: string) {
    return this.newsService.findRelated(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('CREATE', 'News')
  @ApiOperation({ summary: 'Create an article' })
  async create(@Body() dto: CreateNewsDto, @CurrentUser() user: AuthenticatedUser) {
    const news = await this.newsService.create(dto);
    await this.audit.record({ action: 'CREATE', resource: 'News', resourceId: news.id, userId: user.id });
    return news;
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('UPDATE', 'News')
  @ApiOperation({ summary: 'Update an article' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateNewsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const news = await this.newsService.update(id, dto);
    await this.audit.record({ action: 'UPDATE', resource: 'News', resourceId: id, userId: user.id });
    return news;
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('DELETE', 'News')
  @ApiOperation({ summary: 'Delete an article' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.newsService.remove(id);
    await this.audit.record({ action: 'DELETE', resource: 'News', resourceId: id, userId: user.id });
    return result;
  }
}
