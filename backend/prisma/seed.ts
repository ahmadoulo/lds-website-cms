import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * Idempotent bootstrap. Every block checks before it writes, so running this on
 * an existing database (which happens on every container start) is a no-op.
 */
async function main() {
  console.log('[seed] start');

  await seedAdmin();
  await seedSettings();
  await seedNavigation();
  await seedNewsCategories();
  await seedMissions();
  await seedImpact();
  await seedPartners();
  await seedDonationMethods();
  await seedGallery();

  console.log('[seed] done');
}

// ---------------------------------------------------------------- super admin

async function seedAdmin() {
  const email = (process.env.ADMIN_SEED_EMAIL || 'admin@lougasolidaire.org').trim().toLowerCase();
  const password = (process.env.ADMIN_SEED_PASSWORD || 'Password123!').trim();
  const firstName = (process.env.ADMIN_FIRST_NAME || 'Admin').trim();
  const lastName = (process.env.ADMIN_LAST_NAME || 'LDS').trim();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`[seed] admin ${email} already exists`);
    return;
  }

  // Only bootstrap when the database has no super admin at all, so renaming the
  // seed email in the environment never silently creates a second root account.
  const superAdmins = await prisma.user.count({ where: { role: UserRole.SUPER_ADMIN } });
  if (superAdmins > 0) {
    console.log('[seed] a super admin already exists, skipping bootstrap');
    return;
  }

  await prisma.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash(password, 12),
      firstName,
      lastName,
      role: UserRole.SUPER_ADMIN,
      mustChangePassword: true,
    },
  });
  console.log(`[seed] created super admin ${email} (password change required at first login)`);
}

// ------------------------------------------------------------------- settings

async function seedSettings() {
  const defaults: Record<string, any> = {
    organization: {
      name: 'Louga Développement Solidaire',
      shortName: 'LDS',
      tagline: 'Solidarité et action pour un avenir meilleur à Louga',
      about:
        "Louga Développement Solidaire (LDS) est une association à but non lucratif composée de membres résidant au Sénégal et à l'international. LDS tire sa particularité et sa richesse de l'hétérogénéité des profils de ses membres — de l'étudiant à l'ingénieur, en passant par le professeur.",
      mission:
        "Subvenir aux besoins primaires des Lougatois : de la formation professionnelle à l'accès aux soins de santé, en passant par les aides sociales, nous identifions les difficultés pour y apporter des solutions durables.",
      quote: 'Nous croyons qu\u2019ensemble, nous pouvons construire un avenir meilleur pour tous.',
      foundedYear: '',
    },
    global_contact: {
      email: 'lougasolidaire@gmail.com',
      phone: '+221 77 472 33 64',
      phoneSecondary: '+221 77 861 32 02',
      address: 'Keur Serigne Louga Nord, Rue 11 Villa 342, Louga, Sénégal',
    },
    global_social: { facebook: '', instagram: '', linkedin: '', youtube: '' },
    homepage: {
      heroTitle: 'Solidarité et action pour un avenir meilleur à Louga',
      heroSubtitle:
        "Association à but non lucratif engagée pour l'éducation, la santé et le développement durable des Lougatois, au Sénégal et depuis la diaspora.",
      heroBadgeTitle: '100% bénévole',
      heroBadgeSubtitle: 'Sénégal & diaspora',
      heroImageId: null,
      aboutImageId: null,
      ctaQuote: 'Ensemble, pour le développement de Louga.',
      ctaImageId: null,
    },
    seo: {
      title: 'Louga Développement Solidaire',
      description:
        "Association à but non lucratif engagée pour l'éducation, la santé et le développement durable des Lougatois, au Sénégal et depuis la diaspora.",
      keywords: 'association, Louga, Sénégal, solidarité, éducation, santé, développement durable',
      ogImageId: null,
    },
  };

  for (const [key, value] of Object.entries(defaults)) {
    const exists = await prisma.siteSettings.findUnique({ where: { key } });
    if (!exists) {
      await prisma.siteSettings.create({ data: { key, value, type: 'json' } });
      console.log(`[seed] settings.${key} created`);
    }
  }
}

// ----------------------------------------------------------------- navigation

async function seedNavigation() {
  const items = [
    { label: { fr: 'Accueil', en: 'Home' }, href: '/', order: 0 },
    { label: { fr: 'À propos', en: 'About' }, href: '/a-propos', order: 1 },
    { label: { fr: 'Nos actions', en: 'Our actions' }, href: '/nos-actions', order: 2 },
    { label: { fr: 'Actualités', en: 'News' }, href: '/actualites', order: 3 },
    { label: { fr: 'Galerie', en: 'Gallery' }, href: '/galerie', order: 4 },
    { label: { fr: 'Impact', en: 'Impact' }, href: '/impact', order: 5 },
    { label: { fr: 'Partenaires', en: 'Partners' }, href: '/partenaires', order: 6 },
    { label: { fr: 'Contact', en: 'Contact' }, href: '/contact', order: 7 },
  ];

  for (const item of items) {
    const exists = await prisma.navigationItem.findFirst({ where: { href: item.href } });
    if (!exists) await prisma.navigationItem.create({ data: item });
  }
}

// ------------------------------------------------------------ news categories

async function seedNewsCategories() {
  const categories = [
    { name: { fr: 'Actualités', en: 'News' }, slug: 'actualites' },
    { name: { fr: 'Bilan annuel', en: 'Annual report' }, slug: 'bilan-annuel' },
    { name: { fr: 'Événement', en: 'Event' }, slug: 'evenement' },
    { name: { fr: 'Projet', en: 'Project' }, slug: 'projet' },
  ];

  for (const category of categories) {
    const exists = await prisma.newsCategory.findUnique({ where: { slug: category.slug } });
    if (!exists) await prisma.newsCategory.create({ data: category });
  }
}

// ------------------------------------------------------------------- missions

async function seedMissions() {
  if ((await prisma.mission.count()) > 0) return;

  const missions = [
    {
      title: { fr: 'Éducation', en: 'Education' },
      description: {
        fr: 'Distribution de kits scolaires, cours de vacances gratuits et renforcement des apprentissages.',
        en: 'School kit distribution, free holiday classes and learning support.',
      },
      icon: 'GraduationCap',
      order: 0,
      isPublished: true,
    },
    {
      title: { fr: 'Santé', en: 'Health' },
      description: {
        fr: 'Consultations médicales gratuites, campagnes de prévention et distribution de kits sanitaires.',
        en: 'Free medical consultations, prevention campaigns and hygiene kits.',
      },
      icon: 'HeartPulse',
      order: 1,
      isPublished: true,
    },
    {
      title: { fr: 'Environnement', en: 'Environment' },
      description: {
        fr: 'Reboisement, sensibilisation et lancement de jardins scolaires productifs.',
        en: 'Reforestation, awareness raising and productive school gardens.',
      },
      icon: 'TreePine',
      order: 2,
      isPublished: true,
    },
    {
      title: { fr: 'Insertion professionnelle', en: 'Professional integration' },
      description: {
        fr: "Formation des acteurs locaux : apprendre aujourd'hui pour entreprendre demain.",
        en: 'Training local actors: learn today to build tomorrow.',
      },
      icon: 'Briefcase',
      order: 3,
      isPublished: true,
    },
    {
      title: { fr: 'Solidarité & aide sociale', en: 'Solidarity & social aid' },
      description: {
        fr: 'Cantine scolaire, kits sanitaires et assistance directe aux familles les plus fragiles.',
        en: 'School canteen, hygiene kits and direct assistance to vulnerable families.',
      },
      icon: 'HandHeart',
      order: 4,
      isPublished: true,
    },
  ];

  for (const mission of missions) await prisma.mission.create({ data: mission });
  console.log(`[seed] ${missions.length} missions created`);
}

// --------------------------------------------------------------------- impact

async function seedImpact() {
  if ((await prisma.impactStatistic.count()) > 0) return;

  const stats = [
    { label: { fr: 'Kits scolaires distribués', en: 'School kits distributed' }, value: 620, color: '#87CE18', icon: 'Backpack', order: 0, isPublished: true },
    { label: { fr: 'Élèves accompagnés', en: 'Students supported' }, value: 240, color: '#EE7900', icon: 'GraduationCap', order: 1, isPublished: true },
    { label: { fr: 'Patients soignés gratuitement', en: 'Patients treated for free' }, value: 608, color: '#00A4DE', icon: 'Stethoscope', order: 2, isPublished: true },
    { label: { fr: 'Arbres plantés', en: 'Trees planted' }, value: 20, color: '#87CE18', icon: 'Trees', order: 3, isPublished: true },
  ];

  for (const stat of stats) await prisma.impactStatistic.create({ data: stat });
  console.log(`[seed] ${stats.length} impact statistics created`);
}

// ------------------------------------------------------------------- partners

async function seedPartners() {
  if ((await prisma.partner.count()) > 0) return;

  const partners = [
    { name: 'Institut Islamique Manar Al Houda', icon: 'Landmark', isPublished: true, order: 0 },
    { name: 'LaMe', icon: 'HeartPulse', isPublished: true, order: 1 },
    { name: 'YOM France (Ya Oummata Mouhamad)', icon: 'Users', isPublished: true, order: 2 },
  ];

  for (const partner of partners) await prisma.partner.create({ data: partner });
  console.log(`[seed] ${partners.length} partners created`);
}

// ------------------------------------------------------------ donation methods

async function seedDonationMethods() {
  if ((await prisma.donationMethod.count()) > 0) return;

  const methods = [
    {
      title: { fr: 'Faire un don financier', en: 'Make a financial donation' },
      description: {
        fr: 'Contribuez financièrement pour soutenir nos actions sur le terrain. Chaque franc compte.',
        en: 'Contribute financially to support our work on the ground.',
      },
      actionType: 'phone',
      actionData: '+221 77 861 32 02',
      actionLabel: { fr: 'Copier le numéro', en: 'Copy the number' },
      iconColor: 'orange',
      order: 0,
      isPublished: true,
    },
    {
      title: { fr: 'Devenir bénévole', en: 'Become a volunteer' },
      description: {
        fr: 'Offrez un peu de votre temps et de vos compétences pour accompagner nos activités.',
        en: 'Offer some of your time and skills to support our activities.',
      },
      actionType: 'link',
      actionData: '/contact',
      actionLabel: { fr: "Rejoindre l'équipe", en: 'Join the team' },
      iconColor: 'blue',
      order: 1,
      isPublished: true,
    },
    {
      title: { fr: 'Fournir du matériel', en: 'Provide materials' },
      description: {
        fr: 'Soutenez-nous avec du matériel scolaire, médical ou autre, selon les besoins actuels.',
        en: 'Support us with school, medical or other supplies.',
      },
      actionType: 'contact',
      actionData: '/contact',
      actionLabel: { fr: 'Nous contacter', en: 'Contact us' },
      iconColor: 'green',
      order: 2,
      isPublished: true,
    },
  ];

  for (const method of methods) await prisma.donationMethod.create({ data: method });
  console.log(`[seed] ${methods.length} donation methods created`);
}

// -------------------------------------------------------------------- gallery

async function seedGallery() {
  if ((await prisma.galleryAlbum.count()) > 0) return;

  // An empty album so the admin has somewhere to drop the first photos.
  await prisma.galleryAlbum.create({
    data: {
      title: { fr: 'Nos actions sur le terrain', en: 'Our work on the ground' },
      description: {
        fr: 'Des moments forts de nos interventions à Louga.',
        en: 'Highlights of our work in Louga.',
      },
      order: 0,
      isPublished: true,
    },
  });
  console.log('[seed] default gallery album created');
}

main()
  .catch((e) => {
    console.error('[seed] failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
