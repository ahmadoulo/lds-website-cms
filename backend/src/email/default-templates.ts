import type { Localized } from './render';

export interface TemplateDefinition {
  key: TemplateKey;
  name: string;
  /**
   * Who reads it. Internal mail is read by the team, who work in French; it
   * still has the bilingual shape, but its Arabic is left empty rather than
   * written for nobody, and rendering falls back to French.
   */
  audience: 'visitor' | 'team';
  /** Every variable the template may use, with what it holds. */
  variables: Record<string, string>;
  subject: Localized;
  html: Localized;
  text: Localized;
}

export type TemplateKey = 'contact_ack' | 'contact_notify' | 'test';

/*
  The Arabic below is a first draft written to the project glossary, in the
  same state as the other Arabic editorial strings: correct to the best of a
  careful translation, and waiting for LDS to read it before it is relied on.
  It is editable from the back-office like the French.
*/

export const DEFAULT_TEMPLATES: Record<TemplateKey, TemplateDefinition> = {
  contact_ack: {
    key: 'contact_ack',
    name: 'Accusé de réception — formulaire de contact',
    audience: 'visitor',
    variables: {
      firstName: 'Le prénom du visiteur, tel qu’il l’a saisi',
      name: 'Le nom complet saisi',
      subject: 'Le sujet de son message',
      siteName: 'Le nom de l’association',
      siteUrl: 'L’adresse du site',
    },
    subject: {
      fr: 'Nous avons bien reçu votre message — LDS',
      ar: 'لقد تلقّينا رسالتك — جمعية لوغا للتنمية والتضامن',
    },
    html: {
      fr: `<p style="margin:0 0 16px;">Bonjour {{firstName}},</p>
<p style="margin:0 0 16px;">Nous vous remercions d'avoir contacté {{siteName}}.</p>
<p style="margin:0 0 16px;">Votre message a bien été reçu par notre équipe. Nous en prendrons connaissance et reviendrons vers vous dès que possible.</p>
<p style="margin:0 0 16px;">En attendant, nous vous remercions pour l'intérêt que vous portez à nos actions.</p>
<p style="margin:0;">Cordialement,<br />L'équipe {{siteName}}</p>`,
      ar: `<p style="margin:0 0 16px;">مرحبًا {{firstName}}،</p>
<p style="margin:0 0 16px;">نشكرك على تواصلك مع {{siteName}}.</p>
<p style="margin:0 0 16px;">لقد وصلت رسالتك إلى فريقنا، وسنطّلع عليها ونعود إليك في أقرب وقت ممكن.</p>
<p style="margin:0 0 16px;">وفي انتظار ذلك، نشكرك على اهتمامك بأعمالنا.</p>
<p style="margin:0;">مع خالص التحية،<br />فريق {{siteName}}</p>`,
    },
    text: {
      fr: `Bonjour {{firstName}},

Nous vous remercions d'avoir contacté {{siteName}}.

Votre message a bien été reçu par notre équipe. Nous en prendrons connaissance et reviendrons vers vous dès que possible.

En attendant, nous vous remercions pour l'intérêt que vous portez à nos actions.

Cordialement,
L'équipe {{siteName}}
{{siteUrl}}`,
      ar: `مرحبًا {{firstName}}،

نشكرك على تواصلك مع {{siteName}}.

لقد وصلت رسالتك إلى فريقنا، وسنطّلع عليها ونعود إليك في أقرب وقت ممكن.

وفي انتظار ذلك، نشكرك على اهتمامك بأعمالنا.

مع خالص التحية،
فريق {{siteName}}
{{siteUrl}}`,
    },
  },

  contact_notify: {
    key: 'contact_notify',
    name: 'Notification interne — nouvelle demande de contact',
    audience: 'team',
    variables: {
      name: 'Le nom saisi',
      email: 'L’adresse de réponse du visiteur',
      subject: 'Le sujet',
      message: 'Le message complet',
      receivedAt: 'La date et l’heure de réception',
      adminUrl: 'Le lien vers le message dans le back-office',
      siteName: 'Le nom de l’association',
    },
    subject: { fr: 'Nouveau message : {{subject}}', ar: '' },
    html: {
      fr: `<p style="margin:0 0 16px;">Un nouveau message est arrivé par le formulaire de contact.</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;font-size:14px;">
<tr><td style="padding:2px 12px 2px 0;color:#6b7280;">De</td><td style="padding:2px 0;font-weight:600;">{{name}}</td></tr>
<tr><td style="padding:2px 12px 2px 0;color:#6b7280;">Email</td><td style="padding:2px 0;">{{email}}</td></tr>
<tr><td style="padding:2px 12px 2px 0;color:#6b7280;">Sujet</td><td style="padding:2px 0;">{{subject}}</td></tr>
<tr><td style="padding:2px 12px 2px 0;color:#6b7280;">Reçu le</td><td style="padding:2px 0;">{{receivedAt}}</td></tr>
</table>
<div style="margin:0 0 20px;padding:14px 16px;background:#f5f2ec;border-radius:8px;white-space:pre-wrap;">{{message}}</div>
<p style="margin:0;"><a href="{{adminUrl}}" style="color:#00A4DE;">Ouvrir le message dans le back-office</a></p>
<p style="margin:12px 0 0;font-size:13px;color:#6b7280;">Répondre à cet email écrit directement à {{name}}.</p>`,
      ar: '',
    },
    text: {
      fr: `Nouveau message reçu par le formulaire de contact.

De : {{name}}
Email : {{email}}
Sujet : {{subject}}
Reçu le : {{receivedAt}}

{{message}}

Ouvrir dans le back-office : {{adminUrl}}`,
      ar: '',
    },
  },

  test: {
    key: 'test',
    name: 'Email de test SMTP',
    audience: 'team',
    variables: {
      siteName: 'Le nom de l’association',
      sentAt: 'La date et l’heure de l’envoi',
    },
    subject: { fr: 'Test de configuration email — {{siteName}}', ar: '' },
    html: {
      fr: `<p style="margin:0 0 16px;">Cet email confirme que la configuration SMTP de {{siteName}} fonctionne.</p>
<p style="margin:0;color:#6b7280;font-size:13px;">Envoyé le {{sentAt}}.</p>`,
      ar: '',
    },
    text: {
      fr: `Cet email confirme que la configuration SMTP de {{siteName}} fonctionne.

Envoyé le {{sentAt}}.`,
      ar: '',
    },
  },
};
