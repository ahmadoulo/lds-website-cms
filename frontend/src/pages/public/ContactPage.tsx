import React, { useState } from 'react';
import { localizedOrSource } from '../../lib/i18n/resolve';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { AlertCircle, CheckCircle, Mail, MapPin, Phone, Send } from 'lucide-react';
import api, { apiErrorMessage } from '../../lib/api/axios';
import { useSettings } from '../../context/SettingsContext';
import { Seo } from '../../components/seo/Seo';
import { Button } from '../../components/ui/Button';
import { Field, Input, Textarea } from '../../components/ui/Field';
import { useLocale } from '../../context/LocaleContext';
import { cn } from '../../lib/cn';
import { usePagesT } from '../../lib/i18n/dictionaries/pages';

interface FormValues {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const EMPTY_FORM: FormValues = { name: '', email: '', subject: '', message: '' };

export const ContactPage = () => {
  const { settings } = useSettings();
  const { locale } = useLocale();
  const [error, setError] = useState<string | null>(null);
  const [isSent, setIsSent] = useState(false);
  const p = usePagesT();

  const contact = settings?.global_contact;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: EMPTY_FORM });

  const mutation = useMutation({
    // The language the visitor is reading in, so the acknowledgement answers
    // in it. The API accepts only the two published languages.
    mutationFn: async (values: FormValues) =>
      (await api.post('/contact', { ...values, locale })).data,
    onSuccess: () => {
      setError(null);
      setIsSent(true);
      reset(EMPTY_FORM);
    },
    onError: (err) => {
      setError(apiErrorMessage(err, p.contact.sendFailed));
    },
  });

  return (
    <>
      <Seo title={p.contact.seoTitle} description={p.contact.seoDescription} />

      <div className="section-y-sm">
        <div className="mx-auto max-w-[1000px] gutter-x">
          <div className="mb-8 text-center sm:mb-12">
            <h1 className="mb-4 text-h1 font-extrabold text-navy">{p.contact.title}</h1>
            <p className="text-lg text-navy/70">{p.contact.lead}</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:gap-8">
            <div>
              {isSent ? (
                <div className="rounded-3xl border border-green/20 bg-green/10 px-6 py-12 text-center sm:px-8 sm:py-16">
                  <span className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green text-white">
                    {/* A tick is not directional: it reads the same in both scripts. */}
                    <CheckCircle className="h-10 w-10" aria-hidden />
                  </span>
                  <h2 className="mb-3 text-2xl font-bold text-navy">{p.contact.sentTitle}</h2>
                  <p className="mb-8 text-lg text-navy/70">{p.contact.sentMessage}</p>
                  <Button variant="outline" onClick={() => setIsSent(false)}>
                    {p.contact.sendAnother}
                  </Button>
                </div>
              ) : (
                <ContactForm
                  error={error}
                  errors={errors}
                  register={register}
                  isPending={mutation.isPending}
                  onSubmit={handleSubmit((values) => mutation.mutate(values))}
                />
              )}
            </div>

            <aside className="space-y-4">
              {contact?.address && (
                <div className="rounded-2xl border border-navy/8 bg-white p-6">
                  <MapPin className="mb-3 h-5 w-5 text-green" aria-hidden />
                  <h2 className="mb-1 text-sm font-bold text-navy">{p.contact.addressLabel}</h2>
                  <p className="text-sm leading-relaxed text-navy/65">{localizedOrSource(contact.address, locale).text}</p>
                </div>
              )}
              {contact?.phone && (
                <div className="rounded-2xl border border-navy/8 bg-white p-6">
                  <Phone className="mb-3 h-5 w-5 text-blue" aria-hidden />
                  <h2 className="mb-1 text-sm font-bold text-navy">{p.contact.phoneLabel}</h2>
                  {/* A phone number reads left to right in both languages. */}
                  <a
                    href={`tel:${contact.phone.replace(/\s+/g, '')}`}
                    dir="ltr"
                    className="block text-start text-sm text-navy/65 hover:text-blue"
                  >
                    {contact.phone}
                  </a>
                  {contact.phoneSecondary && (
                    <a
                      href={`tel:${contact.phoneSecondary.replace(/\s+/g, '')}`}
                      dir="ltr"
                      className="block text-start text-sm text-navy/65 hover:text-blue"
                    >
                      {contact.phoneSecondary}
                    </a>
                  )}
                </div>
              )}
              {contact?.email && (
                <div className="rounded-2xl border border-navy/8 bg-white p-6">
                  <Mail className="mb-3 h-5 w-5 text-orange" aria-hidden />
                  <h2 className="mb-1 text-sm font-bold text-navy">{p.contact.emailLabel}</h2>
                  <a
                    href={`mailto:${contact.email}`}
                    dir="ltr"
                    className="block break-all text-start text-sm text-navy/65 hover:text-blue"
                  >
                    {contact.email}
                  </a>
                </div>
              )}
            </aside>
          </div>
        </div>
      </div>
    </>
  );
};

interface ContactFormProps {
  error: string | null;
  errors: Record<string, { message?: string } | undefined>;
  register: any;
  isPending: boolean;
  onSubmit: React.FormEventHandler;
}

const ContactForm = ({ error, errors, register, isPending, onSubmit }: ContactFormProps) => {
  /*
    The validation messages are rendered by react-hook-form from the strings
    handed to `register`, so they have to be in the displayed language at the
    moment the rule is declared - which is why the dictionary is read here, in
    the component that owns the form, rather than passed down as props.
  */
  const p = usePagesT();
  const { isRtl } = useLocale();

  return (
    <form onSubmit={onSubmit} className="rounded-3xl bg-white p-6 shadow-e3 sm:p-10" noValidate>
      {error && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="mb-5 grid gap-5 sm:grid-cols-2">
        <Field
          label={p.contact.nameLabel}
          htmlFor="contact-name"
          required
          error={errors.name?.message}
        >
          <Input
            id="contact-name"
            autoComplete="name"
            placeholder={p.contact.namePlaceholder}
            aria-invalid={Boolean(errors.name)}
            {...register('name', {
              required: p.contact.nameRequired,
              minLength: { value: 2, message: p.contact.nameTooShort },
            })}
          />
        </Field>

        <Field
          label={p.contact.emailLabel}
          htmlFor="contact-email"
          required
          error={errors.email?.message}
        >
          <Input
            id="contact-email"
            type="email"
            autoComplete="email"
            /* The address itself is Latin script whatever the page language. */
            dir="ltr"
            placeholder={p.contact.emailPlaceholder}
            aria-invalid={Boolean(errors.email)}
            {...register('email', {
              required: p.contact.emailRequired,
              pattern: { value: /^\S+@\S+\.\S+$/, message: p.contact.emailInvalid },
            })}
          />
        </Field>
      </div>

      <Field
        label={p.contact.subjectLabel}
        htmlFor="contact-subject"
        required
        className="mb-5"
        error={errors.subject?.message}
      >
        <Input
          id="contact-subject"
          placeholder={p.contact.subjectPlaceholder}
          aria-invalid={Boolean(errors.subject)}
          {...register('subject', {
            required: p.contact.subjectRequired,
            minLength: { value: 3, message: p.contact.subjectTooShort },
          })}
        />
      </Field>

      <Field
        label={p.contact.messageLabel}
        htmlFor="contact-message"
        required
        className="mb-7"
        error={errors.message?.message}
      >
        <Textarea
          id="contact-message"
          rows={6}
          placeholder={p.contact.messagePlaceholder}
          aria-invalid={Boolean(errors.message)}
          {...register('message', {
            required: p.contact.messageRequired,
            minLength: { value: 10, message: p.contact.messageMin },
            maxLength: { value: 5000, message: p.contact.messageMax },
          })}
        />
      </Field>

      <Button type="submit" variant="secondary" size="lg" fullWidth isLoading={isPending}>
        {/* A paper plane points the way a message travels: it follows the text. */}
        <Send className={cn('h-4 w-4', isRtl && '-scale-x-100')} aria-hidden />{' '}
        {p.contact.submit}
      </Button>
    </form>
  );
};
