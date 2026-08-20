import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { AlertCircle, HeartHandshake } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiErrorMessage } from '../../lib/api/axios';
import { Button } from '../../components/ui/Button';
import { Field, Input } from '../../components/ui/Field';
import { LoadingState } from '../../components/ui/States';

interface FormValues {
  email: string;
  password: string;
}

export const AdminLogin = () => {
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
        <LoadingState label="Vérification de la session…" />
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
      setError(apiErrorMessage(err, 'Connexion impossible. Vérifiez vos identifiants.'));
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-warm px-4 py-12">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-navy text-green">
            <HeartHandshake className="h-7 w-7" />
          </span>
          <h1 className="text-2xl font-extrabold text-navy">
            LDS <span className="text-green">Administration</span>
          </h1>
          <p className="mt-2 text-sm text-navy/60">
            Connectez-vous pour gérer le contenu du site.
          </p>
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

            <Field label="Adresse email" htmlFor="login-email" required error={errors.email?.message}>
              <Input
                id="login-email"
                type="email"
                autoComplete="username"
                autoFocus
                placeholder="admin@lougasolidaire.org"
                aria-invalid={Boolean(errors.email)}
                {...register('email', {
                  required: "L'adresse email est obligatoire",
                  pattern: { value: /^\S+@\S+\.\S+$/, message: 'Adresse email invalide' },
                })}
              />
            </Field>

            <Field
              label="Mot de passe"
              htmlFor="login-password"
              required
              error={errors.password?.message}
            >
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                aria-invalid={Boolean(errors.password)}
                {...register('password', { required: 'Le mot de passe est obligatoire' })}
              />
            </Field>

            <Button type="submit" variant="secondary" fullWidth size="lg" isLoading={isSubmitting}>
              Se connecter
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-navy/45">
          <a href="/" className="hover:text-navy hover:underline">
            Retour au site public
          </a>
        </p>
      </div>
    </div>
  );
};
