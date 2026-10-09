import React from 'react';
import { useFieldArray, useWatch, type Control, type UseFormRegister } from 'react-hook-form';
import { Megaphone, Plus, Trash2 } from 'lucide-react';
import { useT } from '../../../lib/i18n/useT';
import { ACTION_TYPES, actionNeedsUrl, type AnnouncementFormValues } from '../../../lib/announcementForm';
import { LocalizedFormField } from '../../i18n/LocalizedFormField';
import { Button } from '../../ui/Button';
import { Checkbox, Field, Input, Select } from '../../ui/Field';
import { IconButton } from '../ui/DataTable';


const MAX_ACTIONS = 4;

/**
 * The announcement part of an article: when and where, where it is shown,
 * whom to contact and what the visitor can do next.
 *
 * Folded away by default - an ordinary article needs none of it - and opened
 * on its own when the article being edited already uses it.
 */
export const AnnouncementFields = ({
  control,
  register,
  defaultOpen,
}: {
  control: Control<AnnouncementFormValues>;
  register: UseFormRegister<AnnouncementFormValues>;
  defaultOpen: boolean;
}) => {
  const t = useT().announcements.admin;
  const actionLabels = useT().announcements.actions;
  const { fields, append, remove } = useFieldArray({ control, name: 'actions' });
  const watched = useWatch({ control });
  const actions = watched.actions ?? [];

  return (
    <details open={defaultOpen} className="group rounded-xl border border-navy/10 bg-warm/40">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3">
        <Megaphone className="h-4 w-4 shrink-0 text-orange" aria-hidden />
        <span>
          <span className="block text-sm font-bold text-navy">{t.section}</span>
          <span className="block text-xs text-navy/55">{t.sectionHint}</span>
        </span>
      </summary>

      <div className="space-y-6 border-t border-navy/10 px-4 pb-5 pt-4">
        {/* ------------------------------------------------- publication */}
        <Field label={t.publishAt} htmlFor="news-published-at" hint={t.publishAtHint}>
          <Input id="news-published-at" type="datetime-local" {...register('publishedAt')} />
        </Field>

        {/* ------------------------------------------------ the activity */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.eventStartsAt} htmlFor="news-event-start">
            <Input id="news-event-start" type="datetime-local" {...register('eventStartsAt')} />
          </Field>
          <Field label={t.eventEndsAt} htmlFor="news-event-end">
            <Input id="news-event-end" type="datetime-local" {...register('eventEndsAt')} />
          </Field>
        </div>
        <LocalizedFormField control={control} name="location" id="news-location" label={t.location} maxLength={300} />
        <LocalizedFormField
          control={control}
          name="practicalInfo"
          id="news-practical"
          label={t.practicalInfo}
          hint={t.practicalInfoHint}
          multiline
          rows={3}
          maxLength={2000}
        />

        {/* -------------------------------------------------- placements */}
        <fieldset className="space-y-3">
          <legend className="mb-2 text-sm font-semibold text-navy">{t.placements}</legend>
          <Checkbox id="news-show-banner" label={t.showInBanner} {...register('showInBanner')} />
          {watched.showInBanner && (
            <div className="space-y-4 border-s-2 border-green/40 ps-4">
              <LocalizedFormField
                control={control}
                name="bannerText"
                id="news-banner-text"
                label={t.bannerText}
                hint={t.bannerTextHint}
                maxLength={160}
              />
              <Field label={t.bannerScope} htmlFor="news-banner-scope">
                <Select id="news-banner-scope" {...register('bannerScope')}>
                  <option value="home">{t.bannerScopeHome}</option>
                  <option value="all">{t.bannerScopeAll}</option>
                </Select>
              </Field>
            </div>
          )}
          <Checkbox id="news-show-upcoming" label={t.showInUpcoming} {...register('showInUpcoming')} />
          <Checkbox id="news-featured" label={t.isFeatured} {...register('isFeatured')} />
        </fieldset>

        <fieldset>
          <legend className="text-sm font-semibold text-navy">{t.window}</legend>
          <p className="mb-3 text-xs text-navy/55">{t.windowHint}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t.visibleFrom} htmlFor="news-visible-from">
              <Input id="news-visible-from" type="datetime-local" {...register('visibleFrom')} />
            </Field>
            <Field label={t.visibleUntil} htmlFor="news-visible-until">
              <Input id="news-visible-until" type="datetime-local" {...register('visibleUntil')} />
            </Field>
          </div>
        </fieldset>

        {/* ----------------------------------------------------- contact */}
        <fieldset>
          <legend className="text-sm font-semibold text-navy">{t.contact}</legend>
          <p className="mb-3 text-xs text-navy/55">{t.contactHint}</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={t.contactName} htmlFor="news-contact-name">
              <Input id="news-contact-name" maxLength={120} {...register('contactName')} />
            </Field>
            <Field label={t.contactPhone} htmlFor="news-contact-phone">
              <Input id="news-contact-phone" type="tel" dir="ltr" maxLength={40} {...register('contactPhone')} />
            </Field>
            <Field label={t.contactEmail} htmlFor="news-contact-email">
              <Input id="news-contact-email" type="email" dir="ltr" maxLength={200} {...register('contactEmail')} />
            </Field>
          </div>
        </fieldset>

        {/* ----------------------------------------------------- actions */}
        <fieldset>
          <legend className="text-sm font-semibold text-navy">{t.actions}</legend>
          <p className="mb-3 text-xs text-navy/55">{t.actionsHint}</p>
          <ul className="space-y-3">
            {fields.map((field, index) => {
              const type = actions[index]?.type ?? 'contact';
              return (
                <li key={field.id} className="rounded-lg border border-navy/10 bg-white p-3">
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
                    <Field label={t.actionType} htmlFor={`news-action-${index}-type`}>
                      <Select id={`news-action-${index}-type`} {...register(`actions.${index}.type`)}>
                        {ACTION_TYPES.map((value) => (
                          <option key={value} value={value}>
                            {actionLabels[value]}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label={`${t.actionLabel} · FR`} htmlFor={`news-action-${index}-fr`}>
                      <Input
                        id={`news-action-${index}-fr`}
                        maxLength={60}
                        placeholder={actionLabels[type]}
                        {...register(`actions.${index}.labelFr`)}
                      />
                    </Field>
                    <Field label={`${t.actionLabel} · AR`} htmlFor={`news-action-${index}-ar`}>
                      <Input id={`news-action-${index}-ar`} dir="rtl" lang="ar" maxLength={60} {...register(`actions.${index}.labelAr`)} />
                    </Field>
                    <IconButton label={t.removeAction} icon={Trash2} tone="danger" onClick={() => remove(index)} />
                  </div>
                  {actionNeedsUrl(type) && (
                    <Field
                      className="mt-3"
                      label={t.actionUrl}
                      htmlFor={`news-action-${index}-url`}
                      hint={type === 'page' ? t.actionUrlPage : t.actionUrlExternal}
                    >
                      <Input
                        id={`news-action-${index}-url`}
                        dir="ltr"
                        required
                        placeholder={type === 'page' ? '/nous-soutenir' : 'https://'}
                        {...register(`actions.${index}.url`, {
                          pattern: type === 'page' ? /^\/(?!\/|admin|api)\S*$/ : /^https?:\/\/\S+$/i,
                        })}
                      />
                    </Field>
                  )}
                </li>
              );
            })}
          </ul>
          {fields.length < MAX_ACTIONS && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => append({ type: 'contact', labelFr: '', labelAr: '', url: '' })}
            >
              <Plus className="h-4 w-4" /> {t.addAction}
            </Button>
          )}
        </fieldset>
      </div>
    </details>
  );
};
