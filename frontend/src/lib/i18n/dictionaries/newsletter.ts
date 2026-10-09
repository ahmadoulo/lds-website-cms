/**
 * The public newsletter: the signup form, and the two pages its emails link to.
 *
 * The consent sentence itself is not here. It comes from the API, so what the
 * visitor ticks is word for word what is stored as their consent - two copies
 * of that sentence would be two consents that eventually differ.
 */
export const newsletterFr = {
  title: 'Recevez nos nouvelles',
  intro: 'De temps en temps, par email : nos actions, nos résultats, nos rendez-vous.',
  emailLabel: 'Votre adresse email',
  emailPlaceholder: 'nom@exemple.com',
  submit: 'S’inscrire',
  submitting: 'Envoi…',
  privacy: 'Politique de confidentialité',
  /*
    Worded so it is true whatever happened: the form never says whether an
    address was already on the list, because that would tell anyone who
    types an address whether that person follows the association.
  */
  success:
    'Presque fini : si cette adresse n’est pas déjà inscrite, un email de confirmation vient de lui être envoyé. Cliquez sur le lien qu’il contient.',
  invalidEmail: 'Cette adresse email ne semble pas valide.',
  consentRequired: 'Cochez la case pour confirmer votre accord.',
  tooMany: 'Trop de tentatives. Réessayez dans quelques minutes.',
  unavailable: 'L’inscription est momentanément indisponible.',
  failed: 'L’inscription n’a pas pu être enregistrée. Réessayez dans un instant.',

  page: {
    title: 'Newsletter',
    lead: 'Suivez les actions de l’association à Louga, au Sénégal et depuis la diaspora.',
    points: [
      'Des nouvelles de nos projets, quand il y en a.',
      'Aucune publicité, et votre adresse n’est jamais transmise.',
      'Un lien pour vous désinscrire dans chaque email.',
    ],
    unavailable: 'L’inscription à la newsletter n’est pas encore ouverte. Revenez bientôt.',
  },

  confirm: {
    title: 'Confirmer votre inscription',
    lead: 'Un dernier clic pour recevoir nos nouvelles.',
    button: 'Confirmer mon inscription',
    confirmed: 'Votre inscription est confirmée. Merci !',
    expired:
      'Ce lien a expiré. Inscrivez-vous de nouveau pour recevoir un lien de confirmation récent.',
    invalid:
      'Ce lien n’est pas valide, ou il a déjà été utilisé. Si vous avez déjà confirmé, vous êtes bien inscrit.',
    missing: 'Ce lien est incomplet. Utilisez le bouton de l’email de confirmation.',
    subscribeAgain: 'S’inscrire de nouveau',
  },

  unsubscribe: {
    title: 'Se désinscrire',
    lead: 'Vous ne recevrez plus la newsletter de Louga Développement Solidaire.',
    button: 'Me désinscrire',
    done: 'C’est fait : vous êtes désinscrit. Vous ne recevrez plus la newsletter.',
    invalid: 'Ce lien de désinscription n’est pas valide. Utilisez celui du dernier email reçu.',
    resubscribe: 'Vous avez changé d’avis ? Réinscrivez-vous',
  },

  backHome: 'Retour à l’accueil',

  popup: {
    title: 'Restez informé',
    text: 'Recevez nos actualités et nos réalisations par email.',
    close: 'Fermer',
  },
};

type Translated<T> = {
  readonly [K in keyof T]: T[K] extends readonly string[]
    ? readonly string[]
    : T[K] extends string
      ? string
      : Translated<T[K]>;
};

export type NewsletterDictionary = Translated<typeof newsletterFr>;

/* First draft to the glossary, waiting for LDS to read it. */
export const newsletterAr: NewsletterDictionary = {
  title: 'تلقَّ أخبارنا',
  intro: 'من حين لآخر، عبر البريد الإلكتروني: أعمالنا ونتائجنا ومواعيدنا.',
  emailLabel: 'بريدك الإلكتروني',
  emailPlaceholder: 'name@example.com',
  submit: 'اشترك',
  submitting: 'جارٍ الإرسال…',
  privacy: 'سياسة الخصوصية',
  success:
    'أوشكت على الانتهاء: إن لم يكن هذا العنوان مشتركًا من قبل، فقد أُرسلت إليه رسالة تأكيد. اضغط على الرابط الذي تحتويه.',
  invalidEmail: 'يبدو أن عنوان البريد الإلكتروني غير صالح.',
  consentRequired: 'ضع علامة في الخانة لتأكيد موافقتك.',
  tooMany: 'محاولات كثيرة. أعد المحاولة بعد بضع دقائق.',
  unavailable: 'الاشتراك غير متاح مؤقتًا.',
  failed: 'تعذّر تسجيل الاشتراك. أعد المحاولة بعد قليل.',

  page: {
    title: 'النشرة الإخبارية',
    lead: 'تابع أعمال الجمعية في لوغا وفي السنغال ومن المهجر.',
    points: [
      'أخبار مشاريعنا، حين تكون هناك أخبار.',
      'لا إعلانات، ولا يُنقل عنوانك إلى أي جهة.',
      'رابط لإلغاء الاشتراك في كل رسالة.',
    ],
    unavailable: 'الاشتراك في النشرة الإخبارية غير مفتوح بعد. عُد قريبًا.',
  },

  confirm: {
    title: 'تأكيد الاشتراك',
    lead: 'نقرة أخيرة لتلقّي أخبارنا.',
    button: 'تأكيد اشتراكي',
    confirmed: 'تمّ تأكيد اشتراكك. شكرًا لك!',
    expired: 'انتهت صلاحية هذا الرابط. اشترك من جديد لتصلك رسالة تأكيد حديثة.',
    invalid: 'هذا الرابط غير صالح أو سبق استعماله. إن كنت قد أكّدت من قبل، فأنت مشترك.',
    missing: 'هذا الرابط ناقص. استعمل الزر الموجود في رسالة التأكيد.',
    subscribeAgain: 'الاشتراك من جديد',
  },

  unsubscribe: {
    title: 'إلغاء الاشتراك',
    lead: 'لن تصلك بعد الآن النشرة الإخبارية لجمعية لوغا للتنمية والتضامن.',
    button: 'إلغاء اشتراكي',
    done: 'تمّ: أُلغي اشتراكك ولن تصلك النشرة الإخبارية بعد الآن.',
    invalid: 'رابط إلغاء الاشتراك هذا غير صالح. استعمل الرابط الموجود في آخر رسالة وصلتك.',
    resubscribe: 'غيّرت رأيك؟ اشترك من جديد',
  },

  backHome: 'العودة إلى الصفحة الرئيسية',

  popup: {
    title: 'ابقَ على اطّلاع',
    text: 'تلقَّ أخبارنا وإنجازاتنا عبر البريد الإلكتروني.',
    close: 'إغلاق',
  },
};
