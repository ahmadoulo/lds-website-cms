import React, { useId, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CheckCircle2, Mail } from 'lucide-react';
import api from '../../lib/api/axios';
import { useT } from '../../lib/i18n/useT';
import { useLocale } from '../../context/LocaleContext';
import { cn } from '../../lib/cn';

export interface NewsletterStatus {
  available: boolean;
  privacyPolicyUrl: string | null;
  consentText: { fr: string; ar: string };
}

export const useNewsletterStatus = () =>
  useQuery({
    queryKey: ['public', 'newsletter', 'status'],
    queryFn: async () => (await api.get<NewsletterStatus>('/newsletter/status')).data,
    staleTime: 5 * 60_000,
    // A failure here only means the form is not shown; it is not worth a
    // retry storm from every page of the site.
    retry: false,
  });

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * The newsletter signup form.
 *
 * It renders nothing at all unless the API says sending works: a form whose
 * confirmation email can never leave would take visitors' addresses and give
 * them nothing back. The consent sentence is the server's own, so what the
 * visitor ticks is exactly what is recorded as their consent.
 */
export const NewsletterSignup = ({
  source,
  tone = 'dark',
  className,
}: {
  source: 'footer' | 'page';
  /** dark sits on the navy footer, light on a page. */
  tone?: 'dark' | 'light';
  className?: string;
}) => {
  const t = useT();
  const n = t.newsletter;
  const { locale } = useLocale();
  const id = useId();
  const status = useNewsletterStatus();

  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  // The honeypot: no person sees or fills it.
  const [website, setWebsite] = useState('');
  const [problem, setProblem] = useState<string | null>(null);

  const subscribe = useMutation({
    mutationFn: async () =>
      (
        await api.post('/newsletter/subscribe', {
          email: email.trim(),
          consent,
          locale,
          source,
          ...(website ? { website } : {}),
        })
      ).data,
    onError: (error: { response?: { status?: number } }) => {
      const code = error.response?.status;
      setProblem(
        code === 429
          ? n.tooMany
          : code === 503
            ? n.unavailable
            : code === 400
              ? n.invalidEmail
              : n.failed,
      );
    },
  });

  if (!status.data?.available) return null;

  const dark = tone === 'dark';
  const consentText = status.data.consentText[locale] ?? status.data.consentText.fr;

  if (subscribe.isSuccess) {
    return (
      <p
        role="status"
        className={cn(
          'flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm leading-relaxed',
          dark ? 'bg-white/10 text-white/85' : 'bg-green/10 text-navy',
          className,
        )}
      >
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green" aria-hidden />
        {n.success}
      </p>
    );
  }

  return (
    <form
      noValidate
      className={cn('space-y-3', className)}
      onSubmit={(event) => {
        event.preventDefault();
        setProblem(null);
        if (!EMAIL.test(email.trim())) return setProblem(n.invalidEmail);
        if (!consent) return setProblem(n.consentRequired);
        subscribe.mutate();
      }}
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor={`${id}-email`} className="sr-only">
          {n.emailLabel}
        </label>
        <div className="relative flex-1">
          <Mail
            className={cn(
              'pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2',
              dark ? 'text-white/40' : 'text-navy/35',
            )}
            aria-hidden
          />
          <input
            id={`${id}-email`}
            type="email"
            inputMode="email"
            autoComplete="email"
            dir="ltr"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={n.emailPlaceholder}
            aria-invalid={problem === n.invalidEmail || undefined}
            className={cn(
              // 16px on a phone: iOS zooms the page on a smaller focused field.
              'w-full rounded-xl py-3 pe-3 ps-9 text-base transition-colors focus:outline-none focus:ring-2 sm:text-sm',
              dark
                ? 'border border-white/15 bg-white/5 text-white placeholder:text-white/35 focus:border-white/40 focus:ring-white/20'
                : 'border border-navy/15 bg-white text-navy placeholder:text-navy/35 focus:border-blue focus:ring-blue/20',
            )}
          />
        </div>
        <button
          type="submit"
          disabled={subscribe.isPending}
          className="shrink-0 rounded-xl bg-orange px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-orange/90 disabled:opacity-60"
        >
          {subscribe.isPending ? n.submitting : n.submit}
        </button>
      </div>

      {/* Off screen rather than display:none, which some bots know to skip. */}
      <div aria-hidden className="absolute -start-[9999px] h-px w-px overflow-hidden">
        <label htmlFor={`${id}-website`}>Website</label>
        <input
          id={`${id}-website`}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
        />
      </div>

      <label
        htmlFor={`${id}-consent`}
        className={cn(
          'flex cursor-pointer items-start gap-2.5 text-xs leading-relaxed',
          dark ? 'text-white/55' : 'text-navy/65',
        )}
      >
        <input
          id={`${id}-consent`}
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          // The browser's own box, in the brand's green: a bare white square
          // on navy looked like something left unstyled.
          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded accent-green"
        />
        <span>
          {consentText}
          {status.data.privacyPolicyUrl && (
            <>
              {' '}
              <a
                href={status.data.privacyPolicyUrl}
                target="_blank"
                rel="noopener"
                className={cn(
                  'underline underline-offset-2',
                  dark ? 'text-white/80 hover:text-white' : 'text-blue',
                )}
              >
                {n.privacy}
              </a>
            </>
          )}
        </span>
      </label>

      {problem && (
        <p role="alert" className={cn('text-xs font-medium', dark ? 'text-orange' : 'text-red-600')}>
          {problem}
        </p>
      )}
    </form>
  );
};
