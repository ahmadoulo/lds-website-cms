import React from 'react';
import { cn } from '../../lib/cn';

const CONTROL_CLASSES =
  'w-full rounded-lg border border-navy/15 bg-white px-3 py-2.5 text-sm text-navy transition-colors ' +
  'placeholder:text-navy/35 focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20 ' +
  'disabled:bg-navy/5 disabled:text-navy/50 aria-[invalid=true]:border-red-400 aria-[invalid=true]:ring-red-100';

interface FieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const Field = ({ label, htmlFor, error, hint, required, className, children }: FieldProps) => (
  <div className={cn('space-y-1.5', className)}>
    <label htmlFor={htmlFor} className="block text-sm font-semibold text-navy">
      {label}
      {required && <span className="ml-1 text-orange" aria-hidden>*</span>}
    </label>
    {children}
    {hint && !error && <p className="text-xs text-navy/50">{hint}</p>}
    {error && (
      <p role="alert" className="text-xs font-medium text-red-600">
        {error}
      </p>
    )}
  </div>
);

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(CONTROL_CLASSES, className)} {...props} />
  ),
);
Input.displayName = 'Input';

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(CONTROL_CLASSES, 'resize-y', className)} {...props} />
));
Textarea.displayName = 'Textarea';

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select ref={ref} className={cn(CONTROL_CLASSES, 'pr-8', className)} {...props}>
    {children}
  </select>
));
Select.displayName = 'Select';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, hint, id, className, ...props }, ref) => (
    <label htmlFor={id} className={cn('flex cursor-pointer items-start gap-3', className)}>
      <input
        ref={ref}
        id={id}
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-navy/25 text-blue focus:ring-blue/30"
        {...props}
      />
      <span>
        <span className="block text-sm font-medium text-navy">{label}</span>
        {hint && <span className="block text-xs text-navy/50">{hint}</span>}
      </span>
    </label>
  ),
);
Checkbox.displayName = 'Checkbox';
