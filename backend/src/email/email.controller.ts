import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailSettingsService } from './email-settings.service';
import { TransportService } from './transport.service';
import { TemplatesService } from './templates.service';
import { EmailQueueService } from './email-queue.service';
import { EmailHistoryService } from './email-history.service';
import { DnsCheckService } from './dns-check.service';
import { redact } from './secret-box';
import { resolvePublicApiUrl } from '../common/media-url.interceptor';
import { normaliseSiteUrl } from '../common/site-url';
import {
  HistoryQueryDto,
  PreviewTemplateDto,
  SendTestDto,
  UpdateEmailSettingsDto,
  UpdateTemplateDto,
} from './dto/email.dto';

/**
 * The back-office's email endpoints. Every one requires a signed-in
 * administrator: `Email` is listed at ADMIN in the permission matrix, the same
 * level as the contact messages these emails are about.
 */
@ApiTags('email')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('email')
export class EmailController {
  constructor(
    private readonly settings: EmailSettingsService,
    private readonly transport: TransportService,
    private readonly templates: TemplatesService,
    private readonly queue: EmailQueueService,
    private readonly history: EmailHistoryService,
    private readonly dns: DnsCheckService,
    private readonly audit: AuditService,
    private readonly prisma: PrismaService,
  ) {}

  // ------------------------------------------------------------- overview

  @Get('overview')
  @RequirePermission('READ', 'Email')
  @ApiOperation({ summary: 'The communication cockpit: real counts only' })
  async overview() {
    const [settings, history, unreadContacts, recentContacts] =
      await Promise.all([
        this.settings.get(),
        this.history.overview(30),
        this.prisma.contactMessage.count({ where: { isRead: false } }),
        this.prisma.contactMessage.findMany({
          select: {
            id: true,
            name: true,
            subject: true,
            isRead: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
      ]);

    return {
      smtp: {
        configured: Boolean(
          settings.host && settings.port && settings.fromEmail,
        ),
        enabled: settings.enabled,
        lastTestAt: settings.lastTestAt,
        lastTestOk: settings.lastTestOk,
        warnings: settings.warnings,
        encryptionReady: settings.encryptionReady,
      },
      ...history,
      contacts: { unread: unreadContacts, recent: recentContacts },
    };
  }

  // ------------------------------------------------------------- settings

  @Get('settings')
  @RequirePermission('READ', 'Email')
  @ApiOperation({ summary: 'SMTP settings, without the password' })
  async getSettings(@Req() request: Request) {
    return {
      ...(await this.settings.get()),
      /*
        The address this administrator is using right now, offered as the
        value for the site address field. An authenticated administrator's
        request is a source worth suggesting; it is still only a suggestion
        they confirm by saving.
      */
      detectedSiteUrl: adminOrigin(request),
    };
  }

  @Put('settings')
  @RequirePermission('UPDATE', 'Email')
  @ApiOperation({ summary: 'Save the SMTP settings' })
  async updateSettings(
    @Body() dto: UpdateEmailSettingsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.settings.update(dto);

    // Which fields changed, never their values: the audit log is read by more
    // people than the SMTP account should be.
    await this.audit.record({
      action: 'UPDATE',
      resource: 'EmailSettings',
      userId: user.id,
      metadata: {
        fields: Object.keys(dto).filter((key) => key !== 'password'),
        passwordChanged: dto.password !== undefined,
        enabled: result.enabled,
      },
    });

    return result;
  }

  @Post('settings/verify')
  @HttpCode(200)
  @RequirePermission('UPDATE', 'Email')
  @ApiOperation({
    summary: 'Connect and authenticate, without sending anything',
  })
  async verify() {
    try {
      await this.transport.verify();
      await this.settings.recordTest(true, null);
      return { ok: true, message: 'Connexion et authentification réussies.' };
    } catch (error) {
      await this.settings.recordTest(false, error);
      return { ok: false, message: await this.explain(error) };
    }
  }

  @Post('settings/test')
  @HttpCode(200)
  @RequirePermission('UPDATE', 'Email')
  @ApiOperation({
    summary: 'Send a real test email to an address of your choice',
  })
  async sendTest(
    @Body() dto: SendTestDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    const identity = await this.settings.identityFor('default');
    const sentAt = new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'long',
      timeStyle: 'short',
      timeZone: 'Africa/Dakar',
    }).format(new Date());
    const email = await this.templates.render(
      'test',
      dto.locale ?? 'fr',
      { sentAt },
      { fallbackSiteUrl: adminOrigin(request) },
    );

    /*
      Sent directly rather than through the queue: a test exists to answer
      "does it work?" now, and an answer that arrives in fifteen seconds from a
      background worker is not one the screen can show. It is still recorded in
      the history, with its outcome, like any other email.
    */
    let ok = true;
    let reason: string | null = null;
    try {
      await this.transport.send({
        to: dto.to,
        fromName: identity.fromName,
        fromEmail: identity.fromEmail,
        replyTo: identity.replyTo,
        ...email,
      });
    } catch (error) {
      ok = false;
      reason = await this.explain(error);
    }

    await this.prisma.emailMessage.create({
      data: {
        kind: 'test',
        toEmail: dto.to,
        fromName: identity.fromName,
        fromEmail: identity.fromEmail || '(non configurée)',
        replyTo: identity.replyTo,
        subject: email.subject,
        html: email.html,
        text: email.text,
        locale: dto.locale ?? 'fr',
        status: ok ? 'SENT' : 'FAILED',
        attempts: 1,
        sentAt: ok ? new Date() : null,
        error: reason,
      },
    });
    await this.settings.recordTest(ok, ok ? null : new Error(reason ?? ''));
    await this.audit.record({
      action: 'CREATE',
      resource: 'EmailTest',
      userId: user.id,
      metadata: { ok },
    });

    return ok
      ? {
          ok,
          message:
            "Le serveur SMTP a accepté l'email. Vérifiez la boîte de réception, et le dossier " +
            'des indésirables : accepté ne veut pas encore dire arrivé.',
        }
      : { ok, message: reason };
  }

  @Get('settings/dns')
  @RequirePermission('READ', 'Email')
  @ApiOperation({ summary: 'SPF and DMARC of the sender domain, as published' })
  async dnsReport() {
    const settings = await this.settings.get();
    return this.dns.check(settings.fromEmail);
  }

  // ------------------------------------------------------------ templates

  @Get('templates')
  @RequirePermission('READ', 'Email')
  listTemplates() {
    return this.templates.list();
  }

  @Get('templates/:key')
  @RequirePermission('READ', 'Email')
  getTemplate(@Param('key') key: string) {
    return this.templates.get(key);
  }

  @Put('templates/:key')
  @RequirePermission('UPDATE', 'Email')
  async updateTemplate(
    @Param('key') key: string,
    @Body() dto: UpdateTemplateDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.templates.update(key, dto);
    await this.audit.record({
      action: 'UPDATE',
      resource: 'EmailTemplate',
      resourceId: key,
      userId: user.id,
    });
    return result;
  }

  @Post('templates/:key/reset')
  @HttpCode(200)
  @RequirePermission('UPDATE', 'Email')
  async resetTemplate(
    @Param('key') key: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.templates.reset(key);
    await this.audit.record({
      action: 'UPDATE',
      resource: 'EmailTemplate',
      resourceId: key,
      userId: user.id,
      metadata: { reset: true },
    });
    return result;
  }

  @Post('templates/:key/preview')
  @HttpCode(200)
  @RequirePermission('READ', 'Email')
  previewTemplate(
    @Param('key') key: string,
    @Body() dto: PreviewTemplateDto,
    @Req() request: Request,
  ) {
    return this.templates.preview(
      key,
      dto.locale ?? 'fr',
      dto,
      adminOrigin(request),
    );
  }

  @Post('templates/:key/test')
  @HttpCode(200)
  @RequirePermission('UPDATE', 'Email')
  @ApiOperation({
    summary: 'Send a template, with example values, to one address',
  })
  async testTemplate(
    @Param('key') key: string,
    @Body() dto: SendTestDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    const locale = dto.locale ?? 'fr';
    const email = await this.templates.preview(
      key,
      locale,
      {},
      adminOrigin(request),
    );
    const identity = await this.settings.identityFor('default');

    // Marked as a test in the subject, so nobody mistakes the example values
    // for a real request in an inbox.
    const subject = `[Test] ${email.subject}`;

    let ok = true;
    let reason: string | null = null;
    try {
      await this.transport.send({
        to: dto.to,
        fromName: identity.fromName,
        fromEmail: identity.fromEmail,
        replyTo: identity.replyTo,
        ...email,
        subject,
      });
    } catch (error) {
      ok = false;
      reason = await this.explain(error);
    }

    await this.prisma.emailMessage.create({
      data: {
        kind: 'template_test',
        toEmail: dto.to,
        fromName: identity.fromName,
        fromEmail: identity.fromEmail || '(non configurée)',
        replyTo: identity.replyTo,
        subject,
        html: email.html,
        text: email.text,
        locale,
        status: ok ? 'SENT' : 'FAILED',
        attempts: 1,
        sentAt: ok ? new Date() : null,
        error: reason,
      },
    });
    await this.audit.record({
      action: 'CREATE',
      resource: 'EmailTest',
      resourceId: key,
      userId: user.id,
      metadata: { ok },
    });

    return ok
      ? { ok, message: "Le serveur SMTP a accepté l'email de test." }
      : { ok, message: reason };
  }

  // -------------------------------------------------------------- history

  @Get('messages')
  @RequirePermission('READ', 'Email')
  listMessages(@Query() query: HistoryQueryDto) {
    return this.history.list({
      ...query,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    });
  }

  @Get('messages/:id')
  @RequirePermission('READ', 'Email')
  async getMessage(@Param('id', ParseUUIDPipe) id: string) {
    const message = await this.history.findOne(id);
    if (!message) throw new NotFoundException('Envoi introuvable');
    return message;
  }

  @Get('contacts/:contactId/messages')
  @RequirePermission('READ', 'Email')
  forContact(@Param('contactId', ParseUUIDPipe) contactId: string) {
    return this.history.forContact(contactId);
  }

  @Post('messages/:id/retry')
  @HttpCode(200)
  @RequirePermission('UPDATE', 'Email')
  async retry(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.queue.retry(id).catch((error: Error) => {
      throw new BadRequestException(error.message);
    });
    await this.audit.record({
      action: 'UPDATE',
      resource: 'EmailMessage',
      resourceId: id,
      userId: user.id,
      metadata: { retry: true },
    });
    return result;
  }

  @Post('messages/:id/cancel')
  @HttpCode(200)
  @RequirePermission('UPDATE', 'Email')
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.queue.cancel(id).catch((error: Error) => {
      throw new BadRequestException(error.message);
    });
    await this.audit.record({
      action: 'UPDATE',
      resource: 'EmailMessage',
      resourceId: id,
      userId: user.id,
      metadata: { cancel: true },
    });
    return result;
  }

  /**
   * A provider error, said in words an administrator can act on, with the
   * credentials taken out of it first.
   */
  private async explain(error: unknown): Promise<string> {
    const config = await this.settings.transportConfig().catch(() => null);
    const e = error as {
      code?: string;
      responseCode?: number;
      message?: string;
    };
    const detail = redact(String(e?.message ?? error), [
      config?.password,
      config?.username,
    ]);

    const known: Record<string, string> = {
      EAUTH: 'Identifiant ou mot de passe refusé par le serveur.',
      ECONNECTION:
        'Impossible de joindre le serveur : vérifiez l’hôte et le port.',
      ETIMEDOUT:
        'Le serveur ne répond pas : vérifiez l’hôte, le port et le pare-feu.',
      ESOCKET:
        'La connexion a échoué : le mode de sécurité ne correspond sans doute pas au port ' +
        '(465 = TLS, 587 = STARTTLS).',
      EDNS: "L'hôte SMTP est introuvable : vérifiez son orthographe.",
      EENVELOPE: "Le serveur a refusé l'expéditeur ou le destinataire.",
    };

    const summary =
      (e?.code && known[e.code]) ??
      (e?.message?.includes('pas configuré')
        ? e.message
        : 'Le serveur a refusé l’envoi.');

    return `${summary} (${detail})`;
  }
}

/**
 * The origin of a signed-in administrator's request. Every route in this
 * controller is behind JwtAuthGuard, so this is never a visitor's header.
 */
function adminOrigin(request: Request): string | null {
  return normaliseSiteUrl(resolvePublicApiUrl(request));
}
