import { Controller, DefaultValuePipe, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { PreviewMode } from './preview.decorator';
import { MissionsService } from '../missions/missions.service';
import { NewsService } from '../news/news.service';
import { GalleryService } from '../gallery/gallery.service';
import { ImpactService } from '../impact/impact.service';
import { PartnersService } from '../partners/partners.service';
import { DonationsService } from '../donations/donations.service';
import { SettingsService } from '../settings/settings.service';
import { NavigationService } from '../navigation/navigation.service';

/**
 * Read-only, always-published projection of the CMS used by the public site.
 * It delegates to the same services as the admin API so there is exactly one
 * implementation of every rule.
 */
@ApiTags('public')
// Reads the session when there is one so `?preview=true` can serve drafts to a
// signed-in editor; anonymous visitors always get the published site.
@UseGuards(OptionalJwtAuthGuard)
@ApiQuery({ name: 'preview', required: false, type: Boolean })
@Controller('public')
export class PublicController {
  constructor(
    private readonly missions: MissionsService,
    private readonly news: NewsService,
    private readonly gallery: GalleryService,
    private readonly impact: ImpactService,
    private readonly partners: PartnersService,
    private readonly donations: DonationsService,
    private readonly settings: SettingsService,
    private readonly navigation: NavigationService,
  ) {}

  /**
   * One request that fills the whole homepage. Saves the browser six round trips
   * and guarantees every section renders from a consistent snapshot.
   */
  @Get('homepage')
  @ApiOperation({ summary: 'Everything the homepage needs, in one payload' })
  async getHomepage(@PreviewMode() preview: boolean) {
    const [settings, missions, impact, news, gallery, partners, donations] = await Promise.all([
      this.settings.findAllWithMedia(preview ? 'draft' : 'published'),
      this.missions.findAll(preview),
      this.impact.findAll(preview),
      this.news.findAll({ page: 1, limit: 3 }, preview),
      this.gallery.findPublishedImages(6, preview),
      this.partners.findAll(preview),
      this.donations.findAll(preview),
    ]);

    return {
      settings,
      missions,
      impact,
      news: news.data,
      gallery,
      partners,
      donations,
      isPreview: preview,
    };
  }

  @Get('settings')
  @ApiOperation({ summary: 'Public site settings, with images resolved' })
  getSettings(@PreviewMode() preview: boolean) {
    return this.settings.findAllWithMedia(preview ? 'draft' : 'published');
  }

  @Get('navigation')
  @ApiOperation({ summary: 'Public navigation tree' })
  getNavigation() {
    return this.navigation.findTree();
  }

  @Get('missions')
  @ApiOperation({ summary: 'Published missions' })
  getMissions(@PreviewMode() preview: boolean) {
    return this.missions.findAll(preview);
  }

  @Get('news')
  @ApiOperation({ summary: 'Published articles (paginated)' })
  getNews(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(9), ParseIntPipe) limit: number,
    @PreviewMode() preview: boolean,
  ) {
    return this.news.findAll({ page, limit: Math.min(limit, 50) }, preview);
  }

  @Get('news/categories')
  @ApiOperation({ summary: 'Article categories' })
  getNewsCategories() {
    return this.news.findCategories();
  }

  @Get('news/:slug')
  @ApiOperation({ summary: 'One published article with its suggestions' })
  async getNewsBySlug(@Param('slug') slug: string, @PreviewMode() preview: boolean) {
    const article = await this.news.findOne(slug, preview);
    const related = await this.news.findRelated(article.id, 3);
    return { article, related };
  }

  @Get('gallery')
  @ApiOperation({ summary: 'Published gallery albums with their images' })
  getGallery(@PreviewMode() preview: boolean) {
    return this.gallery.findAllAlbums(preview);
  }

  @Get('gallery/images')
  @ApiOperation({ summary: 'Flat list of published gallery images' })
  getGalleryImages(@PreviewMode() preview: boolean) {
    return this.gallery.findPublishedImages(undefined, preview);
  }

  @Get('impact')
  @ApiOperation({ summary: 'Published impact statistics' })
  getImpact(@PreviewMode() preview: boolean) {
    return this.impact.findAll(preview);
  }

  @Get('partners')
  @ApiOperation({ summary: 'Published partners' })
  getPartners(@PreviewMode() preview: boolean) {
    return this.partners.findAll(preview);
  }

  @Get('donations')
  @ApiOperation({ summary: 'Published ways to support the association' })
  getDonations(@PreviewMode() preview: boolean) {
    return this.donations.findAll(preview);
  }
}
