import React from 'react';
import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import { LocalizedField, type LocalizedValue } from './LocalizedField';
import { useT } from '../../lib/i18n/useT';

interface LocalizedFormFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  id: string;
  label: string;
  /** French is the editorial source and is required by the API. */
  required?: boolean;
  hint?: string;
  multiline?: boolean;
  rows?: number;
  maxLength?: number;
  placeholder?: string;
  className?: string;
}

/**
 * `LocalizedField` wired to react-hook-form.
 *
 * The forms register plain strings elsewhere, but a localized value is an
 * object, so it goes through a Controller rather than a `register`. That
 * boilerplate is written once here rather than sixteen times across the admin
 * screens, which is also what keeps the validation rule identical everywhere:
 * French required, Arabic optional and flagged when absent.
 */
export function LocalizedFormField<T extends FieldValues>({
  control,
  name,
  id,
  label,
  required,
  hint,
  multiline,
  rows,
  maxLength,
  placeholder,
  className,
}: LocalizedFormFieldProps<T>) {
  const t = useT();

  return (
    <Controller
      control={control}
      name={name}
      rules={
        required
          ? {
              validate: (value: LocalizedValue | undefined) =>
                value?.fr?.trim() ? true : t.common.frenchRequired,
            }
          : undefined
      }
      render={({ field, fieldState }) => (
        <LocalizedField
          id={id}
          label={label}
          required={required}
          hint={hint}
          multiline={multiline}
          rows={rows}
          maxLength={maxLength}
          placeholder={placeholder}
          className={className}
          error={fieldState.error?.message}
          value={(field.value as LocalizedValue) ?? {}}
          onChange={field.onChange}
        />
      )}
    />
  );
}
