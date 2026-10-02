import { registerDecorator, type ValidationArguments, type ValidationOptions } from 'class-validator';

/**
 * The two languages the site is published in. A display locale is never
 * anything else: see the frontend's locale resolver, which coerces any other
 * value back to French.
 */
export const DISPLAY_LOCALES = ['fr', 'ar'] as const;

/**
 * What a localized column is allowed to carry on the way in.
 *
 * `en` is tolerated but never written by the product: the seed of earlier
 * versions filled it on 38 fields and no screen has ever displayed it. It is
 * kept accepted so a stored object can round-trip through an update without
 * being rejected, and preserved by `mergeLocalized` rather than dropped. It can
 * be removed from this list once an audit of the production database confirms
 * it holds nothing anyone wants - `npm run i18n:audit` reports exactly that.
 */
const SUPPORTED_LOCALES = [...DISPLAY_LOCALES, 'en'] as readonly string[];

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
          return (
            args.property +
            ' doit être un objet de traductions ({ "fr": "...", "ar": "..." }) avec au minimum le français renseigné.'
          );
        },
      },
    });
  };
}
