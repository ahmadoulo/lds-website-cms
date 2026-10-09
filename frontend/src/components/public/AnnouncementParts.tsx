import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Archive,
  CalendarDays,
  Check,
  ExternalLink,
  HandHeart,
  Info,
  Link2,
  Mail,
  MapPin,
  MessageSquare,
  Newspaper,
  Phone,
  Share2,
  User,
} from 'lucide-react';
import { useLocale } from '../../context/LocaleContext';
import { useSettings } from '../../context/SettingsContext';
import { useT } from '../../lib/i18n/useT';
import { localized } from '../../lib/i18n/resolve';
import { formatEventDate } from '../../lib/eventDate';
import { articleAddress } from '../../lib/siteOrigin';
import { track } from '../../lib/analytics';
import { cn } from '../../lib/cn';
import type { Locale } from '../../lib/i18n/locale';
import type { AnnouncementAction, NewsArticle, SiteSettings } from '../../lib/types';
import { FacebookIcon, InstagramIcon, LinkedInIcon, WhatsAppIcon, YouTubeIcon } from './SocialIcons';

const SOCIAL = [
  { key: 'facebook', Icon: FacebookIcon, label: 'Facebook' },
  { key: 'instagram', Icon: InstagramIcon, label: 'Instagram' },
  { key: 'linkedin', Icon: LinkedInIcon, label: 'LinkedIn' },
  { key: 'youtube', Icon: YouTubeIcon, label: 'YouTube' },
] as const;

const tel = (phone: string) => `tel:${phone.replace(/[^+0-9]/g, '')}`;

/** The archived notice, the practical details and the contact - what is set. */
export const AnnouncementFacts = ({ article }: { article: NewsArticle }) => {
  const t = useT().announcements.details;
  const { locale } = useLocale();

  const when = formatEventDate(article.eventStartsAt, article.eventEndsAt, locale);
  const place = localized(article.location, locale);
  const practical = localized(article.practicalInfo, locale);
  const contact = article.contact;
  const hasContact = Boolean(contact?.name || contact?.phone || contact?.email);

  return (
    <>
      {article.archivedAt && (
        <p
          role="note"
          className="mb-6 flex items-start gap-2.5 rounded-lg border border-orange/25 bg-orange/5 px-4 py-3 text-caption text-navy/80"
        >
          <Archive className="mt-0.5 h-4 w-4 shrink-0 text-orange" aria-hidden />
          {t.archived}
        </p>
      )}

      {(when || place || practical || hasContact) && (
        <section
          aria-label={t.title}
          className="mb-8 rounded-2xl bg-warm-muted p-5 ring-1 ring-navy/5 sm:mb-10 sm:p-6"
        >
          <h2 className="mb-4 text-body-lg font-extrabold text-navy">{t.title}</h2>
          <dl className="grid gap-4 text-body text-navy/80 sm:grid-cols-2">
            {when && <Fact icon={CalendarDays} term={t.when} value={when} />}
            {place && <Fact icon={MapPin} term={t.where} value={place} />}
            {practical && (
              <div className="sm:col-span-2">
                <Fact icon={Info} term={t.practical} value={practical} multiline />
              </div>
            )}
            {hasContact && (
              <div className="sm:col-span-2">
                <dt className="mb-1 flex items-center gap-2 text-caption font-bold uppercase tracking-wider text-navy/55">
                  <User className="h-4 w-4 text-green" aria-hidden /> {t.contact}
                </dt>
                <dd className="flex flex-wrap gap-x-5 gap-y-1 ps-6">
                  {contact?.name && <bdi className="font-semibold">{contact.name}</bdi>}
                  {contact?.phone && (
                    <a href={tel(contact.phone)} className="text-blue hover:underline">
                      <bdi>{contact.phone}</bdi>
                    </a>
                  )}
                  {contact?.email && (
                    <a href={`mailto:${contact.email}`} className="break-all text-blue hover:underline">
                      <bdi>{contact.email}</bdi>
                    </a>
                  )}
                </dd>
              </div>
            )}
          </dl>
        </section>
      )}
    </>
  );
};

const Fact = ({
  icon: Icon,
  term,
  value,
  multiline,
}: {
  icon: typeof Info;
  term: string;
  value: string;
  multiline?: boolean;
}) => (
  <div>
    <dt className="mb-1 flex items-center gap-2 text-caption font-bold uppercase tracking-wider text-navy/55">
      <Icon className="h-4 w-4 text-green" aria-hidden /> {term}
    </dt>
    <dd className={cn('ps-6', multiline && 'whitespace-pre-line')}>{value}</dd>
  </div>
);

type ResolvedAction =
  | { kind: 'link'; to: string; label: string; icon: typeof Info; primary: boolean }
  | { kind: 'href'; href: string; label: string; icon: typeof Info; external: boolean; primary: boolean }
  | {
      kind: 'social';
      label: string;
      links: { href: string; label: string; Icon: typeof FacebookIcon }[];
    };

/**
 * Turns the editor's actions into links, from what the site already manages.
 *
 * A number, an address or an account is never made up: "Call" with no number
 * anywhere is simply not shown, and "Social networks" lists only the accounts
 * set in the settings.
 */
export function resolveActions(
  actions: AnnouncementAction[] | null | undefined,
  article: Pick<NewsArticle, 'contact'>,
  settings: Pick<SiteSettings, 'global_contact' | 'global_social'> | null | undefined,
  locale: Locale,
  labels: Record<AnnouncementAction['type'], string>,
): ResolvedAction[] {
  const phone = article.contact?.phone || settings?.global_contact?.phone;
  const email = article.contact?.email || settings?.global_contact?.email;
  const resolved: ResolvedAction[] = [];

  (actions ?? []).forEach((action) => {
    const label = action.label?.[locale]?.trim() || labels[action.type];
    // The first button that made it through is the one that stands out.
    const primary = resolved.length === 0;
    switch (action.type) {
      case 'contact':
        resolved.push({ kind: 'link', to: '/contact', label, icon: MessageSquare, primary });
        break;
      case 'donate':
        resolved.push({ kind: 'link', to: '/nous-soutenir', label, icon: HandHeart, primary });
        break;
      case 'newsletter':
        resolved.push({ kind: 'link', to: '/newsletter', label, icon: Newspaper, primary });
        break;
      case 'page':
        if (action.url?.startsWith('/') && !action.url.startsWith('//')) {
          resolved.push({ kind: 'link', to: action.url, label, icon: Info, primary });
        }
        break;
      case 'call':
        if (phone) resolved.push({ kind: 'href', href: tel(phone), label, icon: Phone, external: false, primary });
        break;
      case 'email':
        if (email) {
          resolved.push({ kind: 'href', href: `mailto:${email}`, label, icon: Mail, external: false, primary });
        }
        break;
      case 'external':
        if (action.url && /^https?:\/\//i.test(action.url)) {
          resolved.push({ kind: 'href', href: action.url, label, icon: ExternalLink, external: true, primary });
        }
        break;
      case 'social': {
        const social = settings?.global_social;
        const links = SOCIAL.filter(({ key }) => social?.[key]).map(({ key, label: name, Icon }) => ({
          href: social![key],
          label: name,
          Icon,
        }));
        if (links.length) resolved.push({ kind: 'social', label, links });
        break;
      }
    }
  });
  return resolved;
}

/** The buttons under the article: what to do next. */
export const AnnouncementActions = ({ article }: { article: NewsArticle }) => {
  const labels = useT().announcements.actions;
  const { locale } = useLocale();
  const { settings } = useSettings();
  const resolved = resolveActions(article.actions, article, settings, locale, labels);
  if (resolved.length === 0) return null;

  const button = (primary: boolean) =>
    cn(
      'inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-6 py-3 text-body font-bold transition-colors',
      primary
        ? 'bg-orange text-white shadow-cta hover:bg-orange/92'
        : 'border border-navy/15 bg-white text-navy hover:border-navy/45',
    );
  const record = (type: string) => () => track('Announcement Action', { slug: article.slug, type });

  return (
    <div className="mt-10 flex flex-wrap items-center gap-3">
      {resolved.map((item, index) => {
        if (item.kind === 'link') {
          const Icon = item.icon;
          return (
            <Link key={index} to={item.to} onClick={record(item.to)} className={button(item.primary)}>
              <Icon className="h-4 w-4" aria-hidden /> {item.label}
            </Link>
          );
        }
        if (item.kind === 'href') {
          const Icon = item.icon;
          return (
            <a
              key={index}
              href={item.href}
              onClick={record(item.external ? 'external' : item.href.split(':')[0])}
              {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              className={button(item.primary)}
            >
              <Icon className="h-4 w-4" aria-hidden /> {item.label}
            </a>
          );
        }
        return (
          <div key={index} className="flex flex-wrap items-center gap-2">
            <span className="text-body font-semibold text-navy/70">{item.label}</span>
            {item.links.map(({ href, label, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                onClick={record(label.toLowerCase())}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-navy/5 text-navy transition-colors hover:bg-blue hover:text-white"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        );
      })}
    </div>
  );
};

/**
 * Share: the phone's own sheet where there is one, and always WhatsApp,
 * Facebook and a link to copy - which is how news travels in Louga.
 *
 * The address is the canonical one the server wrote (PUBLIC_SITE_URL), never
 * the host the visitor happens to be on.
 */
export const ShareBar = ({ slug, title }: { slug: string; title: string }) => {
  const t = useT().announcements.share;
  const { locale } = useLocale();
  const url = articleAddress(slug, locale);
  const [copied, setCopied] = useState<'ok' | 'failed' | null>(null);
  const [canShare] = useState(
    () => typeof navigator !== 'undefined' && typeof navigator.share === 'function',
  );

  useEffect(() => {
    if (!copied) return undefined;
    const timer = window.setTimeout(() => setCopied(null), 3000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const record = (method: string) => track('Share', { slug, method });

  const nativeShare = async () => {
    record('native');
    try {
      await navigator.share({ title, url });
    } catch {
      // Closed by the visitor: nothing to report.
    }
  };
  const copy = async () => {
    record('copy');
    try {
      await navigator.clipboard.writeText(url);
      setCopied('ok');
    } catch {
      setCopied('failed');
    }
  };

  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`;
  const facebook = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  const pill =
    'inline-flex min-h-11 items-center gap-2 rounded-full border border-navy/12 bg-white px-4 py-2 text-caption font-bold text-navy transition-colors hover:border-navy/40';

  return (
    <section aria-label={t.title} className="mt-10 border-t border-navy/8 pt-6">
      <h2 className="mb-3 flex items-center gap-2 text-caption font-bold uppercase tracking-wider text-navy/55">
        <Share2 className="h-4 w-4" aria-hidden /> {t.title}
      </h2>
      <div className="flex flex-wrap gap-2">
        {canShare && (
          <button type="button" onClick={() => void nativeShare()} className={pill}>
            <Share2 className="h-4 w-4" aria-hidden /> {t.native}
          </button>
        )}
        <a
          href={whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => record('whatsapp')}
          className={pill}
        >
          <WhatsAppIcon className="h-4 w-4 text-green" /> {t.whatsapp}
        </a>
        <a
          href={facebook}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => record('facebook')}
          className={pill}
        >
          <FacebookIcon className="h-4 w-4 text-blue" /> {t.facebook}
        </a>
        <button type="button" onClick={() => void copy()} className={pill}>
          {copied === 'ok' ? (
            <Check className="h-4 w-4 text-green" aria-hidden />
          ) : (
            <Link2 className="h-4 w-4" aria-hidden />
          )}
          {copied === 'ok' ? t.copied : t.copy}
        </button>
      </div>
      <p role="status" className={cn('mt-2 text-caption text-navy/60', copied !== 'failed' && 'sr-only')}>
        {copied === 'ok' ? t.copied : copied === 'failed' ? t.copyFailed : ''}
      </p>
    </section>
  );
};
