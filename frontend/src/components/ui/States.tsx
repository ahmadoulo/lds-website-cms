import React from 'react';
import { AlertCircle, Inbox, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Button } from './Button';

export const Spinner = ({ className }: { className?: string }) => (
  <Loader2 className={cn('h-5 w-5 animate-spin text-navy/40', className)} aria-hidden />
);

export const LoadingState = ({ label = 'Chargement…' }: { label?: string }) => (
  <div className="flex flex-col items-center justify-center gap-3 py-16" role="status" aria-live="polite">
    <Spinner className="h-7 w-7" />
    <p className="text-sm font-medium text-navy/50">{label}</p>
  </div>
);

/** Rectangular placeholder used while a list or card grid loads. */
export const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn('animate-pulse rounded-lg bg-navy/8', className)} aria-hidden />
);

export const SkeletonCards = ({ count = 3, className }: { count?: number; className?: string }) => (
  // Mirrors the real card: same ratio, same radius, same padding, so the page
  // does not jump when the content arrives.
  <div className={cn('grid gap-8 sm:grid-cols-2 lg:grid-cols-3', className)}>
    {Array.from({ length: count }).map((_, index) => (
      <div
        key={index}
        className="overflow-hidden rounded-card bg-white shadow-e2 ring-1 ring-navy/5"
      >
        <Skeleton className="aspect-[16/10] rounded-none" />
        <div className="space-y-3 px-6 pb-7 pt-11">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-4/5" />
        </div>
      </div>
    ))}
  </div>
);

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState = ({
  title,
  description,
  icon: Icon = Inbox,
  action,
  className,
}: EmptyStateProps) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center rounded-panel border border-dashed border-navy/15 bg-white px-6 py-16 text-center',
      className,
    )}
  >
    {/* A soft halo keeps an empty section looking intentional rather than broken. */}
    <div className="relative mb-5">
      <span
        className="absolute inset-0 -m-3 rounded-full bg-warm-muted/70 blur-md"
        aria-hidden
      />
      <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-warm-muted ring-1 ring-navy/5">
        <Icon className="h-7 w-7 text-navy/35" />
      </div>
    </div>
    <h3 className="text-h3 text-navy">{title}</h3>
    {description && (
      <p className="mt-2.5 max-w-md text-body text-navy/60">{description}</p>
    )}
    {action && <div className="mt-7">{action}</div>}
  </div>
);

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState = ({
  title = 'Impossible de charger ces données',
  message = 'Une erreur est survenue. Vérifiez votre connexion puis réessayez.',
  onRetry,
  className,
}: ErrorStateProps) => (
  <div
    role="alert"
    className={cn(
      'flex flex-col items-center justify-center rounded-panel border border-red-200 bg-red-50/60 px-6 py-14 text-center',
      className,
    )}
  >
    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
      <AlertCircle className="h-6 w-6 text-red-600" />
    </div>
    <h3 className="text-base font-bold text-navy">{title}</h3>
    <p className="mt-2 max-w-md text-sm leading-relaxed text-navy/70">{message}</p>
    {onRetry && (
      <Button variant="outline" size="sm" className="mt-6" onClick={onRetry}>
        <RefreshCw className="h-4 w-4" /> Réessayer
      </Button>
    )}
  </div>
);
