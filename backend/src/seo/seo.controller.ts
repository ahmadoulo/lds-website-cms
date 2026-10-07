import { Controller, Get, Header, Req, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { SeoService } from './seo.service';
import { resolvePublicApiUrl } from '../common/media-url.interceptor';

/**
 * robots.txt and sitemap.xml.
 *
 * They live behind the API because both have to state absolute URLs and
 * neither knows the site's address at build time: the same image is deployed
 * to the preview host and to ldslouga.sn. The origin is read from the
 * forwarded headers nginx already sends, so each host describes itself.
 *
 * nginx maps `/robots.txt` and `/sitemap.xml` onto these two routes, which is
 * where a crawler looks for them - `/api/v1/...` is not a place anything would
 * think to ask.
 */
@ApiExcludeController()
@Controller('public')
export class SeoController {
  constructor(private readonly seo: SeoService) {}

  /**
   * `PUBLIC_SITE_URL` wins when it is set, because the site and the API are
   * only the same origin as long as nginx fronts both. It is a public address,
   * not a secret.
   */
  private origin(request: Request): string {
    const configured = process.env.PUBLIC_SITE_URL?.trim();
    if (configured) return configured.replace(/\/+$/, '');
    return resolvePublicApiUrl(request);
  }

  @Get('robots.txt')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=3600')
  robots(@Req() request: Request): string {
    return this.seo.buildRobots(this.origin(request));
  }

  @Get('sitemap.xml')
  async sitemap(
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    const xml = await this.seo.buildSitemap(this.origin(request));

    /*
      Written to the response directly rather than returned: the global
      MediaUrlInterceptor walks whatever a handler returns looking for media
      objects, and handing it a 40 KB string is work for nothing. @Header()
      would also be overridden by Nest's default JSON serializer here.
    */
    response
      .status(200)
      .setHeader('Content-Type', 'application/xml; charset=utf-8')
      .setHeader('Cache-Control', 'public, max-age=3600')
      .send(xml);
  }
}
