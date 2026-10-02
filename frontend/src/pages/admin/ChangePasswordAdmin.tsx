import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { AlertCircle, KeyRound, ShieldAlert } from 'lucide-react';
import api from '../../lib/api/axios';
import { apiErrorMessage } from '../../lib/apiErrorMessage';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../context/LocaleContext';
import { useT } from '../../lib/i18n/useT';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import { Field, Input } from '../../components/ui/Field';

interface FormValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export const ChangePasswordAdmin = () => {
  const t = useT();
  const { locale } = useLocale();
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);

  const isForced = Boolean(user?.mustChangePassword);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const newPassword = watch('newPassword');

  const onSubmit = async (values: FormValues) => {
    setError(null);
    try {
      await api.post('/auth/change-password', {
        // On a forced first change the API does not ask for the old password.
        currentPassword: isForced ? undefined : values.currentPassword,
        newPassword: values.newPassword,
      });
      await refreshUser();
      toast.success(t.admin.password.success);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err, t.admin.password.failed, locale));
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-warm px-4 py-12">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-navy text-green">
            <KeyRound className="h-7 w-7" />
          </span>
          <h1 className="text-2xl font-extrabold text-navy">{t.admin.password.title}</h1>
          <p className="mt-2 text-sm text-navy/60">
            {isForced ? t.admin.password.forcedIntro : t.admin.password.intro}
          </p>
        </div>

        <div className="rounded-2xl border border-navy/8 bg-white p-6 shadow-sm sm:p-8">
          {isForced && (
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-orange/25 bg-orange/5 px-4 py-3">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-orange" />
              <p className="text-sm text-navy/75">{t.admin.password.forcedNotice}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            {error && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {!isForced && (
              <Field
                label={t.admin.password.currentLabel}
                htmlFor="current-password"
                required
                error={errors.currentPassword?.message}
              >
                <Input
                  id="current-password"
                  type="password"
                  autoComplete="current-password"
                  aria-invalid={Boolean(errors.currentPassword)}
                  {...register('currentPassword', {
                    required: t.admin.password.currentRequired,
                  })}
                />
              </Field>
            )}

            <Field
              label={t.admin.password.newLabel}
              htmlFor="new-password"
              required
              hint={t.admin.password.newHint}
              error={errors.newPassword?.message}
            >
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                aria-invalid={Boolean(errors.newPassword)}
                {...register('newPassword', {
                  required: t.admin.password.newRequired,
                  minLength: { value: 8, message: t.admin.password.minLength },
                  validate: (value) => {
                    if (!/[A-Za-z]/.test(value)) return t.admin.password.needsLetter;
                    if (!/[0-9]/.test(value)) return t.admin.password.needsDigit;
                    return true;
                  },
                })}
              />
            </Field>

            <Field
              label={t.admin.password.confirmLabel}
              htmlFor="confirm-password"
              required
              error={errors.confirmPassword?.message}
            >
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                aria-invalid={Boolean(errors.confirmPassword)}
                {...register('confirmPassword', {
                  required: t.admin.password.confirmRequired,
                  validate: (value) => value === newPassword || t.admin.password.mismatch,
                })}
              />
            </Field>

            <Button type="submit" variant="secondary" fullWidth size="lg" isLoading={isSubmitting}>
              {t.admin.password.submit}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
