import { Controller, Get, Header, Query, Req, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { SeoService, SITEMAP_LOCALES, DEFAULT_LOCALE } from './seo.service';
import { PageMetaService, type Locale } from './page-meta.service';
import { PageShellService } from './page-shell.service';
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
  constructor(
    private readonly seo: SeoService,
    private readonly pageMeta: PageMetaService,
    private readonly pageShell: PageShellService,
  ) {}

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

  /**
   * The SPA shell, with this page's own metadata written into it.
   *
   * Every public page view comes through here. Until now the built
   * index.html was served to everyone unchanged, so the HTML a crawler
   * received carried the home page's title and no description, canonical or
   * structured data at all - correct tags appeared only once React had run.
   * Google runs it; WhatsApp, Facebook and LinkedIn do not, which is why
   * every shared article showed the generic site preview.
   *
   * nginx sends the path and query here and falls back to the static file if
   * this is unavailable, so a failure degrades to exactly the previous
   * behaviour rather than to a blank page.
   */
  @Get('page-shell')
  async pageShellFor(
    @Req() request: Request,
    @Res() response: Response,
    @Query('path') rawPath?: string,
    @Query('lang') rawLang?: string,
  ): Promise<void> {
    /*
      nginx sends these as headers because the path arrives decoded and
      putting it back into a query string would misread any path containing
      an ampersand. The query parameters stay supported so the endpoint can
      be exercised directly, which is how it is tested.
    */
    const path = normalisePath(header(request, 'x-lds-path') ?? rawPath);
    const locale = normaliseLocale(header(request, 'x-lds-lang') ?? rawLang);

    const shell = await this.pageShell.shell();
    const meta = await this.pageMeta.resolve(
      path,
      locale,
      this.origin(request),
    );

    response
      .status(meta.status)
      .setHeader('Content-Type', 'text/html; charset=utf-8')
      /*
        Never cached. The document is a few kilobytes and is rebuilt from the
        CMS on every request: an editor who corrects a title expects to see it
        in a share preview immediately, and the asset hashes inside it change
        on every deploy.
      */
      .setHeader('Cache-Control', 'no-cache, must-revalidate')
      // The same URL answers French or Arabic depending on the query, which a
      // shared cache has to key on.
      .setHeader('Vary', 'Accept-Language')
      .setHeader('X-Content-Type-Options', 'nosniff')
      .send(this.pageShell.render(shell, meta));
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

/**
 * The path nginx forwarded, reduced to something that can be matched.
 *
 * It arrives already decoded. A missing or relative value becomes the home
 * page rather than an error: this route is reached by visitors, not by
 * callers, and there is no sensible way to show them a validation message.
 */
function header(request: Request, name: string): string | undefined {
  const value = request.headers[name];
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && raw.length > 0 ? raw : undefined;
}

function normalisePath(raw: string | undefined): string {
  if (!raw || !raw.startsWith('/')) return '/';
  // The router treats /contact and /contact/ as one page, so the canonical
  // must not depend on a trailing slash.
  const trimmed = raw.length > 1 ? raw.replace(/\/+$/, '') : raw;
  return trimmed || '/';
}

function normaliseLocale(raw: string | undefined): Locale {
  const base = (raw ?? '').trim().toLowerCase().split(/[-_]/)[0];
  return (SITEMAP_LOCALES as readonly string[]).includes(base)
    ? (base as Locale)
    : DEFAULT_LOCALE;
}
