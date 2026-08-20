import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { AlertCircle, CheckCircle, Mail, MapPin, Phone, Send } from 'lucide-react';
import api, { apiErrorMessage } from '../../lib/api/axios';
import { useSettings } from '../../context/SettingsContext';
import { Seo } from '../../components/seo/Seo';
import { Button } from '../../components/ui/Button';
import { Field, Input, Textarea } from '../../components/ui/Field';

interface FormValues {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const EMPTY_FORM: FormValues = { name: '', email: '', subject: '', message: '' };

export const ContactPage = () => {
  const { settings } = useSettings();
  const [error, setError] = useState<string | null>(null);
  const [isSent, setIsSent] = useState(false);

  const contact = settings?.global_contact;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: EMPTY_FORM });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => (await api.post('/contact', values)).data,
    onSuccess: () => {
      setError(null);
      setIsSent(true);
      reset(EMPTY_FORM);
    },
    onError: (err) => {
      setError(apiErrorMessage(err, "Votre message n'a pas pu être envoyé. Merci de réessayer."));
    },
  });

  return (
    <>
      <Seo
        title="Contact"
        description="Contactez Louga Développement Solidaire : une question, une suggestion ou une envie de nous rejoindre."
      />

      <div className="px-6 py-[80px]">
        <div className="mx-auto max-w-[1000px]">
          <div className="mb-12 text-center">
            <h1 className="mb-4 text-[clamp(32px,4vw,44px)] font-extrabold text-navy">
              Contactez-nous
            </h1>
            <p className="text-lg text-navy/70">
              Une question, une suggestion ou une envie de nous rejoindre ? Écrivez-nous.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
            <div>
              {isSent ? (
                <div className="rounded-3xl border border-green/20 bg-green/10 px-8 py-16 text-center">
                  <span className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green text-white">
                    <CheckCircle className="h-10 w-10" aria-hidden />
                  </span>
                  <h2 className="mb-3 text-2xl font-bold text-navy">Message envoyé !</h2>
                  <p className="mb-8 text-lg text-navy/70">
                    Merci pour votre message. Nous vous répondrons dans les plus brefs délais.
                  </p>
                  <Button variant="outline" onClick={() => setIsSent(false)}>
                    Envoyer un autre message
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
                  <h2 className="mb-1 text-sm font-bold text-navy">Adresse</h2>
                  <p className="text-sm leading-relaxed text-navy/65">{contact.address}</p>
                </div>
              )}
              {contact?.phone && (
                <div className="rounded-2xl border border-navy/8 bg-white p-6">
                  <Phone className="mb-3 h-5 w-5 text-blue" aria-hidden />
                  <h2 className="mb-1 text-sm font-bold text-navy">Téléphone</h2>
                  <a
                    href={`tel:${contact.phone.replace(/\s+/g, '')}`}
                    className="block text-sm text-navy/65 hover:text-blue"
                  >
                    {contact.phone}
                  </a>
                  {contact.phoneSecondary && (
                    <a
                      href={`tel:${contact.phoneSecondary.replace(/\s+/g, '')}`}
                      className="block text-sm text-navy/65 hover:text-blue"
                    >
                      {contact.phoneSecondary}
                    </a>
                  )}
                </div>
              )}
              {contact?.email && (
                <div className="rounded-2xl border border-navy/8 bg-white p-6">
                  <Mail className="mb-3 h-5 w-5 text-orange" aria-hidden />
                  <h2 className="mb-1 text-sm font-bold text-navy">Email</h2>
                  <a
                    href={`mailto:${contact.email}`}
                    className="break-all text-sm text-navy/65 hover:text-blue"
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

const ContactForm = ({ error, errors, register, isPending, onSubmit }: ContactFormProps) => (
  <form
    onSubmit={onSubmit}
    className="rounded-3xl bg-white p-6 shadow-[0_24px_50px_-18px_rgba(23,38,66,0.08)] sm:p-10"
    noValidate
  >
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
      <Field label="Prénom et nom" htmlFor="contact-name" required error={errors.name?.message}>
        <Input
          id="contact-name"
          autoComplete="name"
          placeholder="Aïssatou Diop"
          aria-invalid={Boolean(errors.name)}
          {...register('name', {
            required: "Merci d'indiquer votre nom",
            minLength: { value: 2, message: 'Nom trop court' },
          })}
        />
      </Field>

      <Field label="Email" htmlFor="contact-email" required error={errors.email?.message}>
        <Input
          id="contact-email"
          type="email"
          autoComplete="email"
          placeholder="votre@email.com"
          aria-invalid={Boolean(errors.email)}
          {...register('email', {
            required: "L'adresse email est obligatoire",
            pattern: { value: /^\S+@\S+\.\S+$/, message: 'Adresse email invalide' },
          })}
        />
      </Field>
    </div>

    <Field
      label="Sujet"
      htmlFor="contact-subject"
      required
      className="mb-5"
      error={errors.subject?.message}
    >
      <Input
        id="contact-subject"
        placeholder="De quoi souhaitez-vous parler ?"
        aria-invalid={Boolean(errors.subject)}
        {...register('subject', {
          required: 'Merci de préciser un sujet',
          minLength: { value: 3, message: 'Sujet trop court' },
        })}
      />
    </Field>

    <Field
      label="Message"
      htmlFor="contact-message"
      required
      className="mb-7"
      error={errors.message?.message}
    >
      <Textarea
        id="contact-message"
        rows={6}
        placeholder="Votre message…"
        aria-invalid={Boolean(errors.message)}
        {...register('message', {
          required: 'Le message est obligatoire',
          minLength: { value: 10, message: '10 caractères minimum' },
          maxLength: { value: 5000, message: '5000 caractères maximum' },
        })}
      />
    </Field>

    <Button type="submit" variant="secondary" size="lg" fullWidth isLoading={isPending}>
      <Send className="h-4 w-4" aria-hidden /> Envoyer le message
    </Button>
  </form>
);
