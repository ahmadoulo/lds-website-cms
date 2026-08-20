import { Controller, Get, Param, Query, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
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
  async getHomepage() {
    const [settings, missions, impact, news, gallery, partners, donations] = await Promise.all([
      this.settings.findAllWithMedia(),
      this.missions.findAll(false),
      this.impact.findAll(false),
      this.news.findAll({ page: 1, limit: 3 }, false),
      this.gallery.findPublishedImages(6),
      this.partners.findAll(false),
      this.donations.findAll(false),
    ]);

    return {
      settings,
      missions,
      impact,
      news: news.data,
      gallery,
      partners,
      donations,
    };
  }

  @Get('settings')
  @ApiOperation({ summary: 'Public site settings, with images resolved' })
  getSettings() {
    return this.settings.findAllWithMedia();
  }

  @Get('navigation')
  @ApiOperation({ summary: 'Public navigation tree' })
  getNavigation() {
    return this.navigation.findTree();
  }

  @Get('missions')
  @ApiOperation({ summary: 'Published missions' })
  getMissions() {
    return this.missions.findAll(false);
  }

  @Get('news')
  @ApiOperation({ summary: 'Published articles (paginated)' })
  getNews(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(9), ParseIntPipe) limit: number,
  ) {
    return this.news.findAll({ page, limit: Math.min(limit, 50) }, false);
  }

  @Get('news/categories')
  @ApiOperation({ summary: 'Article categories' })
  getNewsCategories() {
    return this.news.findCategories();
  }

  @Get('news/:slug')
  @ApiOperation({ summary: 'One published article with its suggestions' })
  async getNewsBySlug(@Param('slug') slug: string) {
    const article = await this.news.findOne(slug, false);
    const related = await this.news.findRelated(article.id, 3);
    return { article, related };
  }

  @Get('gallery')
  @ApiOperation({ summary: 'Published gallery albums with their images' })
  getGallery() {
    return this.gallery.findAllAlbums(false);
  }

  @Get('gallery/images')
  @ApiOperation({ summary: 'Flat list of published gallery images' })
  getGalleryImages() {
    return this.gallery.findPublishedImages();
  }

  @Get('impact')
  @ApiOperation({ summary: 'Published impact statistics' })
  getImpact() {
    return this.impact.findAll(false);
  }

  @Get('partners')
  @ApiOperation({ summary: 'Published partners' })
  getPartners() {
    return this.partners.findAll(false);
  }

  @Get('donations')
  @ApiOperation({ summary: 'Published ways to support the association' })
  getDonations() {
    return this.donations.findAll(false);
  }
}
