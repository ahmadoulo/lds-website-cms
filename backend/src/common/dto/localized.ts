import { registerDecorator, type ValidationArguments, type ValidationOptions } from 'class-validator';

const SUPPORTED_LOCALES = ['fr', 'en'];

/**
 * Content is stored as { fr: "...", en: "..." } JSON columns. This validator
 * guarantees the object really has that shape (and at least the French value,
 * which is the primary language of the site) instead of accepting arbitrary JSON.
 */
export function IsLocalizedText(
  options: { requireFr?: boolean; maxLength?: number } = {},
  validationOptions?: ValidationOptions,
) {
  const { requireFr = true, maxLength = 20000 } = options;

  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isLocalizedText',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;

          const keys = Object.keys(value);
          if (keys.length === 0) return false;
          if (keys.some((k) => !SUPPORTED_LOCALES.includes(k))) return false;
          if (keys.some((k) => typeof value[k] !== 'string' || value[k].length > maxLength)) return false;
          if (requireFr && (typeof value.fr !== 'string' || value.fr.trim().length === 0)) return false;

          return true;
        },
        defaultMessage(args: ValidationArguments) {
          return args.property + ' doit être un objet de traductions ({ "fr": "...", "en": "..." }) avec au minimum le français renseigné.';
        },
      },
    });
  };
}
