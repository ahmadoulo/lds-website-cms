import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import { EmailSettingsService } from '../email/email-settings.service';
import {
  CONSENT_TEXT,
  NewsletterService,
  NewsletterUnavailableError,
} from './newsletter.service';
import {
  ConfirmDto,
  ImportDto,
  SubscribeDto,
  SubscriberQueryDto,
  UnsubscribeDto,
} from './dto/newsletter.dto';

/** What a visitor sees after asking to subscribe, whatever happened. */
const SUBSCRIBED = { ok: true };

/**
 * The public side: subscribe, confirm, leave. No account, no session.
 */
@ApiTags('newsletter')
@Controller('newsletter')
export class NewsletterPublicController {
  constructor(
    private readonly newsletter: NewsletterService,
    private readonly settings: EmailSettingsService,
  ) {}

  @Get('status')
  @ApiOperation({
    summary: 'Whether the signup form should be shown, and its consent wording',
  })
  async status() {
    return {
      available: await this.newsletter.isAvailable(),
      privacyPolicyUrl: await this.settings.privacyPolicyUrl(),
      consentText: CONSENT_TEXT,
    };
  }

  @Post('subscribe')
  @HttpCode(202)
  // Ten minutes, five tries per address of origin: enough for a typo, not for
  // a script working through a list.
  @Throttle({ default: { limit: 5, ttl: 600_000 } })
  @ApiOperation({ summary: 'Ask to subscribe. Always answers the same way.' })
  async subscribe(@Body() dto: SubscribeDto) {
    try {
      await this.newsletter.subscribe({
        email: dto.email,
        consent: dto.consent,
        locale: dto.locale ?? 'fr',
        source: dto.source ?? 'footer',
        website: dto.website,
      });
    } catch (error) {
      if (error instanceof NewsletterUnavailableError) {
        throw new ServiceUnavailableException(
          "L'inscription est momentanément indisponible.",
        );
      }
      throw error;
    }
    return SUBSCRIBED;
  }

  @Post('confirm')
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 600_000 } })
  async confirm(@Body() dto: ConfirmDto) {
    return { result: await this.newsletter.confirm(dto.token) };
  }

  /** The button on the unsubscribe page. */
  @Post('unsubscribe')
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 600_000 } })
  async unsubscribe(@Body() dto: UnsubscribeDto) {
    return { ok: await this.newsletter.unsubscribe(dto.s, dto.t, dto.c) };
  }

  /**
   * RFC 8058 one-click unsubscribe, posted by the mail client itself.
   *
   * The parameters are in the URL the List-Unsubscribe header carries; the
   * body is only `List-Unsubscribe=One-Click` and is not read. Answers 200
   * whatever the outcome - a mail client has no use for anything else, and a
   * different answer for a wrong token would let anyone probe for valid ids.
   */
  @Post('unsubscribe/one-click')
  @HttpCode(200)
  @Throttle({ default: { limit: 60, ttl: 600_000 } })
  async oneClick(@Query() query: UnsubscribeDto) {
    await this.newsletter.unsubscribe(query.s, query.t, query.c);
    return { ok: true };
  }
}

/**
 * The back-office side. Reading and unsubscribing are administrator work;
 * exporting, erasing and importing personal data in bulk are the super
 * administrator's - see ACTION_MIN_LEVEL in the permissions guard.
 */
@ApiTags('newsletter')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('newsletter/subscribers')
export class NewsletterAdminController {
  constructor(
    private readonly newsletter: NewsletterService,
    private readonly audit: AuditService,
  ) {}

  @Get('stats')
  @RequirePermission('READ', 'Subscriber')
  stats() {
    return this.newsletter.stats();
  }

  /** Why the signup form is not on the site, if it is not. */
  @Get('availability')
  @RequirePermission('READ', 'Subscriber')
  async availability() {
    const missing = await this.newsletter.missing();
    return { available: missing.length === 0, missing };
  }

  @Get()
  @RequirePermission('READ', 'Subscriber')
  list(@Query() query: SubscriberQueryDto) {
    return this.newsletter.list(toQuery(query));
  }

  @Get('export')
  @RequirePermission('EXPORT', 'Subscriber')
  async export(
    @Query() query: SubscriberQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res() response: Response,
  ) {
    const { csv, count } = await this.newsletter.exportCsv(toQuery(query));
    // How many, and with which filter - never the addresses themselves.
    await this.audit.record({
      action: 'EXPORT',
      resource: 'Subscriber',
      userId: user.id,
      metadata: {
        count,
        status: query.status ?? 'ACTIVE',
        locale: query.locale ?? null,
      },
    });
    const day = new Date().toISOString().slice(0, 10);
    response
      .status(200)
      .setHeader('Content-Type', 'text/csv; charset=utf-8')
      .setHeader(
        'Content-Disposition',
        `attachment; filename="abonnes-${day}.csv"`,
      )
      .setHeader('Cache-Control', 'no-store')
      .send(csv);
  }

  @Post(':id/unsubscribe')
  @HttpCode(200)
  @RequirePermission('UPDATE', 'Subscriber')
  async unsubscribe(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.newsletter.adminUnsubscribe(id);
    await this.audit.record({
      action: 'UPDATE',
      resource: 'Subscriber',
      resourceId: id,
      userId: user.id,
      metadata: { unsubscribed: true },
    });
    return { ok: true };
  }

  @Delete(':id')
  @RequirePermission('DELETE', 'Subscriber')
  async erase(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!(await this.newsletter.erase(id)))
      throw new NotFoundException('Abonné introuvable');
    // The id only: the point of erasing is that the address is gone.
    await this.audit.record({
      action: 'DELETE',
      resource: 'Subscriber',
      resourceId: id,
      userId: user.id,
    });
    return { ok: true };
  }

  @Post('import')
  @HttpCode(200)
  @RequirePermission('IMPORT', 'Subscriber')
  async import(@Body() dto: ImportDto, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.newsletter.import(dto.csv, user.id);
    await this.audit.record({
      action: 'CREATE',
      resource: 'Subscriber',
      userId: user.id,
      metadata: { import: true, ...result },
    });
    return result;
  }
}

function toQuery(query: SubscriberQueryDto) {
  return {
    ...query,
    from: query.from ? new Date(query.from) : undefined,
    to: query.to ? new Date(query.to) : undefined,
  };
}
