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
  /**
   * Whether it is sent until someone decides otherwise. Optional emails ship
   * switched off: a welcome message or a per-subscriber alert is the
   * association's choice to make, not a default to discover in an inbox.
   */
  defaultActive?: boolean;
}

export type TemplateKey =
  | 'contact_ack'
  | 'contact_notify'
  | 'test'
  | 'newsletter_confirm'
  | 'newsletter_welcome'
  | 'newsletter_subscribed'
  | 'campaign_completed';

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
  newsletter_confirm: {
    key: 'newsletter_confirm',
    name: 'Confirmation d’inscription à la newsletter',
    audience: 'visitor',
    variables: {
      confirmUrl: 'Le lien qui confirme l’inscription (valable 48 heures)',
      siteName: 'Le nom de l’association',
      siteUrl: 'L’adresse du site',
    },
    subject: {
      fr: 'Confirmez votre inscription — {{siteName}}',
      ar: 'أكّد اشتراكك — {{siteName}}',
    },
    html: {
      fr: `<p style="margin:0 0 16px;">Bonjour,</p>
<p style="margin:0 0 16px;">Vous avez demandé à recevoir les nouvelles de {{siteName}}. Pour confirmer votre inscription, cliquez sur le bouton ci-dessous.</p>
<p style="margin:0 0 24px;"><a href="{{confirmUrl}}" style="display:inline-block;background:#EE7900;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:8px;">Confirmer mon inscription</a></p>
<p style="margin:0 0 16px;font-size:13px;color:#6b7280;">Ce lien est valable 48 heures. Si vous n’êtes pas à l’origine de cette demande, ignorez cet email : vous ne recevrez rien.</p>`,
      ar: `<p style="margin:0 0 16px;">مرحبًا،</p>
<p style="margin:0 0 16px;">طلبت تلقّي أخبار {{siteName}}. لتأكيد اشتراكك، اضغط على الزر أدناه.</p>
<p style="margin:0 0 24px;"><a href="{{confirmUrl}}" style="display:inline-block;background:#EE7900;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:8px;">تأكيد الاشتراك</a></p>
<p style="margin:0 0 16px;font-size:13px;color:#6b7280;">هذا الرابط صالح لمدة 48 ساعة. إن لم تكن أنت من طلب ذلك، فتجاهل هذه الرسالة: لن تصلك أي رسالة.</p>`,
    },
    text: {
      fr: `Bonjour,

Vous avez demandé à recevoir les nouvelles de {{siteName}}. Pour confirmer votre inscription, ouvrez ce lien :

{{confirmUrl}}

Ce lien est valable 48 heures. Si vous n’êtes pas à l’origine de cette demande, ignorez cet email : vous ne recevrez rien.`,
      ar: `مرحبًا،

طلبت تلقّي أخبار {{siteName}}. لتأكيد اشتراكك، افتح هذا الرابط:

{{confirmUrl}}

هذا الرابط صالح لمدة 48 ساعة. إن لم تكن أنت من طلب ذلك، فتجاهل هذه الرسالة: لن تصلك أي رسالة.`,
    },
  },

  newsletter_welcome: {
    key: 'newsletter_welcome',
    name: 'Bienvenue — inscription confirmée',
    audience: 'visitor',
    defaultActive: false,
    variables: {
      siteName: 'Le nom de l’association',
      siteUrl: 'L’adresse du site',
    },
    subject: {
      fr: 'Bienvenue — {{siteName}}',
      ar: 'مرحبًا بك — {{siteName}}',
    },
    html: {
      fr: `<p style="margin:0 0 16px;">Bonjour,</p>
<p style="margin:0 0 16px;">Votre inscription est confirmée. Vous recevrez désormais les nouvelles de {{siteName}}.</p>
<p style="margin:0;">Merci de suivre nos actions.</p>`,
      ar: `<p style="margin:0 0 16px;">مرحبًا،</p>
<p style="margin:0 0 16px;">تمّ تأكيد اشتراكك. ستصلك من الآن أخبار {{siteName}}.</p>
<p style="margin:0;">شكرًا لمتابعتك أعمالنا.</p>`,
    },
    text: {
      fr: `Bonjour,

Votre inscription est confirmée. Vous recevrez désormais les nouvelles de {{siteName}}.

Merci de suivre nos actions.`,
      ar: `مرحبًا،

تمّ تأكيد اشتراكك. ستصلك من الآن أخبار {{siteName}}.

شكرًا لمتابعتك أعمالنا.`,
    },
  },

  newsletter_subscribed: {
    key: 'newsletter_subscribed',
    name: 'Notification interne — nouvel abonné',
    audience: 'team',
    defaultActive: false,
    variables: {
      email: 'L’adresse de l’abonné',
      locale: 'Sa langue',
      source: 'Où il s’est inscrit',
      siteName: 'Le nom de l’association',
    },
    subject: { fr: 'Nouvel abonné à la newsletter', ar: '' },
    html: {
      fr: `<p style="margin:0 0 12px;">Une nouvelle inscription à la newsletter vient d’être confirmée.</p>
<p style="margin:0;font-size:14px;">{{email}} · langue : {{locale}} · source : {{source}}</p>`,
      ar: '',
    },
    text: {
      fr: `Une nouvelle inscription à la newsletter vient d’être confirmée.

{{email}} · langue : {{locale}} · source : {{source}}`,
      ar: '',
    },
  },

  campaign_completed: {
    key: 'campaign_completed',
    name: 'Notification interne — campagne terminée',
    audience: 'team',
    variables: {
      campaignName: 'Le nom interne de la campagne',
      sent: 'Emails acceptés par le serveur',
      failed: 'Emails en échec',
      cancelled: 'Emails non envoyés (désinscriptions, annulations)',
      campaignUrl: 'Le lien vers la campagne dans le back-office',
      siteName: 'Le nom de l’association',
    },
    subject: { fr: 'Campagne terminée : {{campaignName}}', ar: '' },
    html: {
      fr: `<p style="margin:0 0 16px;">La campagne <strong>{{campaignName}}</strong> a fini d’être envoyée.</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;font-size:14px;">
<tr><td style="padding:2px 12px 2px 0;color:#6b7280;">Acceptés par le serveur</td><td style="padding:2px 0;font-weight:600;">{{sent}}</td></tr>
<tr><td style="padding:2px 12px 2px 0;color:#6b7280;">Échecs</td><td style="padding:2px 0;font-weight:600;">{{failed}}</td></tr>
<tr><td style="padding:2px 12px 2px 0;color:#6b7280;">Non envoyés</td><td style="padding:2px 0;font-weight:600;">{{cancelled}}</td></tr>
</table>
<p style="margin:0 0 12px;font-size:13px;color:#6b7280;">« Accepté » signifie que le serveur d’envoi a pris l’email en charge, pas qu’il est arrivé dans la boîte de réception.</p>
<p style="margin:0;"><a href="{{campaignUrl}}" style="color:#00A4DE;">Voir la campagne</a></p>`,
      ar: '',
    },
    text: {
      fr: `La campagne « {{campaignName}} » a fini d’être envoyée.

Acceptés par le serveur : {{sent}}
Échecs : {{failed}}
Non envoyés : {{cancelled}}

« Accepté » signifie que le serveur d’envoi a pris l’email en charge, pas qu’il est arrivé dans la boîte de réception.

{{campaignUrl}}`,
      ar: '',
    },
  },
};
