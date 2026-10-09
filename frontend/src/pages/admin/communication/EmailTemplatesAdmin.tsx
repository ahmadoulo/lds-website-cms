import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, FileCode2, RotateCcw } from 'lucide-react';
import api from '../../../lib/api/axios';
import { useT } from '../../../lib/i18n/useT';
import { useAdminMutation } from '../../../lib/queries/adminHooks';
import { apiErrorMessage } from '../../../lib/apiErrorMessage';
import { useLocale } from '../../../context/LocaleContext';
import { PageHeader } from '../../../components/admin/ui/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '../../../components/ui/States';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { Checkbox, Field, Input, Textarea } from '../../../components/ui/Field';
import { EmailPreview, Section, TestSendForm } from '../../../components/admin/email/EmailParts';
import { cn } from '../../../lib/cn';
import type { EmailTemplate, RenderedEmail, TestResult } from '../../../lib/types';

type Lang = 'fr' | 'ar';
type Part = 'subject' | 'html' | 'text';
type Draft = Record<Part, Record<Lang, string>>;

const VARIABLE = /\{\{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\}\}/g;

function toDraft(template: EmailTemplate): Draft {
  const pick = (value: Record<string, string> | undefined) => ({
    fr: value?.fr ?? '',
    ar: value?.ar ?? '',
  });
  return { subject: pick(template.subject), html: pick(template.html), text: pick(template.text) };
}

export const EmailTemplatesAdmin = () => {
  const [params, setParams] = useSearchParams();
  const selected = params.get('key');

  return selected ? (
    <TemplateEditor templateKey={selected} onBack={() => setParams({})} />
  ) : (
    <TemplateList onOpen={(key) => setParams({ key })} />
  );
};

/* ------------------------------------------------------------------ list */

const TemplateList = ({ onOpen }: { onOpen: (key: string) => void }) => {
  const t = useT();
  const m = t.admin.email.templates;

  const query = useQuery({
    queryKey: ['admin', 'email', 'templates'],
    queryFn: async () => (await api.get<EmailTemplate[]>('/email/templates')).data,
  });

  return (
    <div>
      <PageHeader title={m.title} description={m.description} />
      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : !query.data?.length ? (
        <EmptyState icon={FileCode2} title={m.title} description={m.description} />
      ) : (
        <ul className="divide-y divide-navy/8 overflow-hidden rounded-xl border border-navy/8 bg-white">
          {query.data.map((template) => (
            <li key={template.key}>
              <button
                type="button"
                onClick={() => onOpen(template.key)}
                className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-4 text-start transition-colors hover:bg-warm-muted/40 sm:px-5"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-navy">{template.name}</span>
                  <span className="mt-1 block truncate text-xs text-navy/55">
                    {template.subject.fr}
                  </span>
                </span>
                <span className="flex flex-wrap items-center gap-2">
                  <Badge tone={template.audience === 'visitor' ? 'blue' : 'navy'}>
                    {template.audience === 'visitor' ? m.audienceVisitor : m.audienceTeam}
                  </Badge>
                  <Badge tone={template.isActive ? 'green' : 'neutral'}>
                    {template.isActive ? m.active : m.inactive}
                  </Badge>
                  {template.unknownVariables.length > 0 && (
                    <AlertTriangle className="h-4 w-4 text-orange" aria-hidden />
                  )}
                  <span className="text-xs text-navy/40">
                    {template.updatedAt ? m.updated(t.admin.common.formatDate(template.updatedAt)) : m.neverEdited}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

/* ---------------------------------------------------------------- editor */

const TemplateEditor = ({ templateKey, onBack }: { templateKey: string; onBack: () => void }) => {
  const t = useT();
  const m = t.admin.email.templates;
  const { locale, isRtl } = useLocale();

  const query = useQuery({
    queryKey: ['admin', 'email', 'templates', templateKey],
    queryFn: async () =>
      (await api.get<EmailTemplate>(`/email/templates/${encodeURIComponent(templateKey)}`)).data,
  });

  const [draft, setDraft] = useState<Draft | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [lang, setLang] = useState<Lang>('fr');
  const [confirmReset, setConfirmReset] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  /** Where a clicked variable goes: the last field that had focus. */
  const lastField = useRef<{ part: Part; element: HTMLInputElement | HTMLTextAreaElement } | null>(
    null,
  );

  useEffect(() => {
    if (query.data) {
      setDraft(toDraft(query.data));
      setIsActive(query.data.isActive);
    }
  }, [query.data]);

  const dirty = useMemo(
    () =>
      Boolean(
        draft &&
          query.data &&
          (JSON.stringify(draft) !== JSON.stringify(toDraft(query.data)) ||
            isActive !== query.data.isActive),
      ),
    [draft, isActive, query.data],
  );

  /*
    The preview follows the draft, not what is stored, so the editor shows the
    email it is about to save. Debounced: a request per keystroke would render
    the same email forty times while a word is typed.
  */
  const [debounced, setDebounced] = useState<Draft | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(draft), 500);
    return () => clearTimeout(timer);
  }, [draft]);

  const preview = useQuery({
    queryKey: ['admin', 'email', 'preview', templateKey, lang, debounced],
    enabled: Boolean(debounced),
    queryFn: async () =>
      (
        await api.post<RenderedEmail>(`/email/templates/${encodeURIComponent(templateKey)}/preview`, {
          locale: lang,
          subject: debounced!.subject,
          html: debounced!.html,
          text: debounced!.text,
        })
      ).data,
    placeholderData: (previous) => previous,
  });

  const save = useAdminMutation<void, EmailTemplate>({
    mutationFn: async () =>
      (
        await api.put<EmailTemplate>(`/email/templates/${encodeURIComponent(templateKey)}`, {
          ...draft,
          isActive,
        })
      ).data,
    successMessage: m.saved,
    invalidate: [['admin', 'email', 'templates']],
  });

  const reset = useAdminMutation<void, EmailTemplate>({
    mutationFn: async () =>
      (await api.post<EmailTemplate>(`/email/templates/${encodeURIComponent(templateKey)}/reset`)).data,
    successMessage: m.resetDone,
    invalidate: [['admin', 'email', 'templates']],
    onSuccess: () => setConfirmReset(false),
  });

  const sendTest = useMutation({
    mutationFn: async (to: string) =>
      (
        await api.post<TestResult>(`/email/templates/${encodeURIComponent(templateKey)}/test`, {
          to,
          locale: lang,
        })
      ).data,
    onSuccess: setTestResult,
    onError: (error) =>
      setTestResult({ ok: false, message: apiErrorMessage(error, undefined, locale) }),
  });

  if (query.isLoading || (query.data && !draft)) return <LoadingState />;
  if (query.isError || !query.data || !draft) {
    return <ErrorState onRetry={() => void query.refetch()} />;
  }

  const template = query.data;
  const known = Object.keys(template.variables);

  // The same check the API makes, live, so a typo shows before saving.
  const unknown = [
    ...new Set(
      (['subject', 'html', 'text'] as Part[]).flatMap((part) =>
        (['fr', 'ar'] as Lang[]).flatMap((l) =>
          [...draft[part][l].matchAll(VARIABLE)].map((match) => match[1]),
        ),
      ),
    ),
  ].filter((name) => !known.includes(name));

  const update = (part: Part, value: string) =>
    setDraft((current) =>
      current ? { ...current, [part]: { ...current[part], [lang]: value } } : current,
    );

  const insert = (name: string) => {
    const token = `{{${name}}}`;
    const target = lastField.current;
    if (!target) {
      update('html', `${draft.html[lang]}${token}`);
      return;
    }
    const { element, part } = target;
    const start = element.selectionStart ?? element.value.length;
    const end = element.selectionEnd ?? start;
    const next = element.value.slice(0, start) + token + element.value.slice(end);
    update(part, next);
    // Back to where the visitor was typing, after the inserted variable.
    requestAnimationFrame(() => {
      element.focus();
      element.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const track = (part: Part) => (event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    lastField.current = { part, element: event.currentTarget };
  };

  // The language being edited decides the direction of the fields, not the
  // language of the back-office around them.
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy/60 hover:text-navy"
      >
        <ArrowLeft className={cn('h-4 w-4', isRtl && 'rotate-180')} aria-hidden /> {m.title}
      </button>

      <PageHeader
        title={template.name}
        description={template.audience === 'visitor' ? m.audienceVisitor : m.audienceTeam}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        {/* ------------------------------------------------ editing */}
        <form
          className="space-y-6"
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate();
          }}
        >
          <Section title={m.html} hint={m.htmlHint}>
            <div role="tablist" className="flex gap-2">
              {(['fr', 'ar'] as Lang[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={lang === value}
                  onClick={() => setLang(value)}
                  className={cn(
                    'rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors',
                    lang === value
                      ? 'bg-navy text-white'
                      : 'bg-white text-navy/60 ring-1 ring-navy/10 hover:text-navy',
                  )}
                >
                  {value === 'fr' ? 'Français' : 'العربية'}
                </button>
              ))}
            </div>

            {lang === 'ar' && (
              <p className="rounded-lg bg-blue/5 px-3 py-2 text-xs text-navy/65">
                {template.audience === 'team' ? m.teamFrenchOnly : m.arabicFallback}
              </p>
            )}

            <Field label={m.subject} htmlFor="tpl-subject">
              <Input
                id="tpl-subject"
                dir={dir}
                lang={lang}
                value={draft.subject[lang]}
                onFocus={track('subject')}
                onChange={(event) => update('subject', event.target.value.replace(/[\r\n]/g, ' '))}
              />
            </Field>
            <Field label={m.html} htmlFor="tpl-html">
              <Textarea
                id="tpl-html"
                dir={dir}
                lang={lang}
                rows={12}
                spellCheck={false}
                className="font-mono text-xs leading-relaxed"
                value={draft.html[lang]}
                onFocus={track('html')}
                onChange={(event) => update('html', event.target.value)}
              />
            </Field>
            <Field label={m.text} htmlFor="tpl-text" hint={m.textHint}>
              <Textarea
                id="tpl-text"
                dir={dir}
                lang={lang}
                rows={8}
                value={draft.text[lang]}
                onFocus={track('text')}
                onChange={(event) => update('text', event.target.value)}
              />
            </Field>

            <div>
              <p className="mb-2 text-sm font-semibold text-navy">{m.variables}</p>
              <ul className="flex flex-wrap gap-2">
                {Object.entries(template.variables).map(([name, description]) => (
                  <li key={name}>
                    <button
                      type="button"
                      title={description}
                      aria-label={m.insertVariable(name)}
                      onClick={() => insert(name)}
                      className="rounded-md bg-warm-muted px-2 py-1 font-mono text-xs text-navy transition-colors hover:bg-blue/10"
                      dir="ltr"
                    >
                      {`{{${name}}}`}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {unknown.length > 0 && (
              <p className="flex items-start gap-2 rounded-lg bg-orange/10 px-3 py-2 text-sm text-navy">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange" aria-hidden />
                {m.unknownVariables(unknown.join(', '))}
              </p>
            )}
          </Section>

          <div className="flex flex-col gap-4 rounded-xl border border-navy/8 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
            <Checkbox
              label={m.activeToggle}
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" type="button" onClick={() => setConfirmReset(true)}>
                <RotateCcw className="h-4 w-4" aria-hidden /> {m.reset}
              </Button>
              <Button type="submit" isLoading={save.isPending} disabled={!dirty}>
                {m.save}
              </Button>
            </div>
          </div>
        </form>

        {/* ------------------------------------------------ preview */}
        <div className="space-y-6">
          <Section title={m.preview} hint={m.previewHint}>
            {preview.data ? (
              <>
                <p className="text-sm">
                  <span className="text-navy/55">{m.subject} : </span>
                  <span className="font-semibold text-navy" dir="auto">
                    {preview.data.subject}
                  </span>
                </p>
                <EmailPreview html={preview.data.html} title={template.name} />
              </>
            ) : preview.isError ? (
              <ErrorState onRetry={() => void preview.refetch()} />
            ) : (
              <LoadingState />
            )}
          </Section>

          <Section title={m.testTitle} hint={m.testHint}>
            {/* The test sends what is stored, so unsaved edits would make it
                send something other than what the preview shows. */}
            {dirty && (
              <p className="text-sm text-orange">{t.admin.email.settings.unsavedBeforeTest}</p>
            )}
            <TestSendForm
              label={t.admin.email.settings.testTo}
              buttonLabel={t.admin.email.settings.testSend}
              disabled={dirty}
              isPending={sendTest.isPending}
              result={testResult}
              onSend={(to) => sendTest.mutate(to)}
            />
          </Section>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmReset}
        title={m.resetTitle}
        message={m.resetMessage}
        confirmLabel={m.reset}
        isLoading={reset.isPending}
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => reset.mutate()}
      />
    </div>
  );
};

export default EmailTemplatesAdmin;
