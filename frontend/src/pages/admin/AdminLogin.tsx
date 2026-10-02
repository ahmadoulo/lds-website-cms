import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../context/LocaleContext';
import { useT } from '../../lib/i18n/useT';
import { apiErrorMessage } from '../../lib/apiErrorMessage';
import { Button } from '../../components/ui/Button';
import { Field, Input } from '../../components/ui/Field';
import { LoadingState } from '../../components/ui/States';
import { SiteLogo } from '../../components/public/SiteLogo';

interface FormValues {
  email: string;
  password: string;
}

export const AdminLogin = () => {
  const t = useT();
  const { locale } = useLocale();
  const { login, isAuthenticated, isBootstrapping } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ defaultValues: { email: '', password: '' } });

  if (isBootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-warm">
        <LoadingState label={t.admin.login.checkingSession} />
      </div>
    );
  }

  if (isAuthenticated) {
    const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname;
    return <Navigate to={from ?? '/admin'} replace />;
  }

  const onSubmit = async (values: FormValues) => {
    setError(null);
    try {
      const user = await login(values.email, values.password);
      navigate(user.mustChangePassword ? '/admin/mot-de-passe' : '/admin', { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err, t.admin.login.failed, locale));
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-warm px-4 py-12">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="mb-5 flex justify-center">
            <SiteLogo />
          </span>
          <h1 className="text-xl font-bold text-navy">{t.admin.login.title}</h1>
          <p className="mt-2 text-sm text-navy/60">{t.admin.login.subtitle}</p>
        </div>

        <div className="rounded-2xl border border-navy/8 bg-white p-6 shadow-sm sm:p-8">
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

            <Field
              label={t.admin.common.emailLabel}
              htmlFor="login-email"
              required
              error={errors.email?.message}
            >
              <Input
                id="login-email"
                type="email"
                autoComplete="username"
                autoFocus
                placeholder="admin@lougasolidaire.org"
                aria-invalid={Boolean(errors.email)}
                {...register('email', {
                  required: t.admin.common.emailRequired,
                  pattern: { value: /^\S+@\S+\.\S+$/, message: t.admin.common.emailInvalid },
                })}
              />
            </Field>

            <Field
              label={t.admin.login.password}
              htmlFor="login-password"
              required
              error={errors.password?.message}
            >
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                aria-invalid={Boolean(errors.password)}
                {...register('password', { required: t.admin.login.passwordRequired })}
              />
            </Field>

            <Button type="submit" variant="secondary" fullWidth size="lg" isLoading={isSubmitting}>
              {t.admin.login.submit}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-navy/45">
          <a href="/" className="hover:text-navy hover:underline">
            {t.admin.login.backToSite}
          </a>
        </p>
      </div>
    </div>
  );
};
