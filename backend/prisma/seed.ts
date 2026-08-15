import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Initial Admin Bootstrap
  const adminEmail = process.env.ADMIN_SEED_EMAIL || 'admin@lougasolidaire.org';
  const adminPassword = process.env.ADMIN_SEED_PASSWORD || 'Password123!';
  const adminFirstName = process.env.ADMIN_FIRST_NAME || 'Admin';
  const adminLastName = process.env.ADMIN_LAST_NAME || 'LDS';

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    console.log(`Creating default administrator: ${adminEmail}`);
    const hash = await bcrypt.hash(adminPassword, 10);
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: hash,
        firstName: adminFirstName,
        lastName: adminLastName,
        role: UserRole.SUPER_ADMIN,
        mustChangePassword: true, // Crucial: forces change on first login
      },
    });
  } else {
    console.log(`Administrator ${adminEmail} already exists. Skipping creation.`);
  }

  // 2. Navigation
  const navItems = [
    { label: { fr: 'Accueil', en: 'Home' }, href: '/', order: 1 },
    { label: { fr: "L'Association", en: 'Association' }, href: '/a-propos', order: 2 },
    { label: { fr: 'Missions', en: 'Missions' }, href: '/nos-actions', order: 3 },
    { label: { fr: 'Galerie', en: 'Gallery' }, href: '/galerie', order: 4 },
    { label: { fr: 'Actualités', en: 'News' }, href: '/actualites', order: 5 },
    { label: { fr: 'Contact', en: 'Contact' }, href: '/contact', order: 6 },
  ];
  
  for (const item of navItems) {
    const exists = await prisma.navigationItem.findFirst({ where: { href: item.href } });
    if (!exists) {
      await prisma.navigationItem.create({ data: item });
    }
  }

  // 3. Missions
  const missionsCount = await prisma.mission.count();
  if (missionsCount === 0) {
    const missions = [
      { 
        title: { fr: 'Éducation', en: 'Education' },
        description: { fr: 'Distribution de kits scolaires, cours de vacances gratuits et renforcement.', en: 'School kits distribution, free holiday classes.' },
        icon: 'GraduationCap',
        order: 1,
        isPublished: true
      },
      { 
        title: { fr: 'Santé', en: 'Health' },
        description: { fr: 'Consultations médicales gratuites et actions de prévention.', en: 'Free medical consultations and prevention actions.' },
        icon: 'HeartPulse',
        order: 2,
        isPublished: true
      },
      { 
        title: { fr: 'Environnement', en: 'Environment' },
        description: { fr: 'Reboisement et lancement de jardins scolaires productifs.', en: 'Reforestation and productive school gardens.' },
        icon: 'TreePine',
        order: 3,
        isPublished: true
      },
      { 
        title: { fr: 'Insertion professionnelle', en: 'Professional Integration' },
        description: { fr: "Formation des acteurs locaux : apprendre aujourd'hui pour entreprendre demain.", en: 'Training local actors.' },
        icon: 'Briefcase',
        order: 4,
        isPublished: true
      },
      { 
        title: { fr: 'Solidarité & Aide sociale', en: 'Solidarity & Social Aid' },
        description: { fr: 'Cantine scolaire, kits sanitaires et assistance directe.', en: 'School canteen, hygiene kits, direct assistance.' },
        icon: 'HandHeart',
        order: 5,
        isPublished: true
      }
    ];

    for (const m of missions) {
      await prisma.mission.create({ data: m });
    }
  }

  // 4. Impact Statistics
  const statsCount = await prisma.impactStatistic.count();
  if (statsCount === 0) {
    const stats = [
      { label: { fr: 'Kits scolaires distribués', en: 'School kits distributed' }, value: 620, color: '#87CE18', order: 1, isPublished: true },
      { label: { fr: 'Élèves accompagnés', en: 'Students supported' }, value: 240, color: '#EE7900', order: 2, isPublished: true },
      { label: { fr: 'Patients soignés gratuitement', en: 'Patients treated for free' }, value: 608, color: '#00A4DE', order: 3, isPublished: true },
      { label: { fr: 'Arbres plantés', en: 'Trees planted' }, value: 20, color: '#172642', order: 4, isPublished: true },
    ];

    for (const s of stats) {
      await prisma.impactStatistic.create({ data: s });
    }
  }

  // 5. Partners
  const partnersCount = await prisma.partner.count();
  if (partnersCount === 0) {
    const partners = [
      { name: 'Institut Islamique Manar Al Houda', icon: 'Mosque', isPublished: true, order: 1 },
      { name: 'LaMe', icon: 'HeartPulse', isPublished: true, order: 2 },
      { name: 'Orange Money', icon: 'Smartphone', isPublished: true, order: 3 },
    ];

    for (const p of partners) {
      await prisma.partner.create({ data: p });
    }
  }

  // 6. News
  const newsCount = await prisma.news.count();
  if (newsCount === 0) {
    let newsCategory = await prisma.newsCategory.findUnique({ where: { slug: 'bilan-annuel' } });
    if (!newsCategory) {
      newsCategory = await prisma.newsCategory.create({
        data: { name: { fr: 'Bilan annuel', en: 'Annual Report' }, slug: 'bilan-annuel' }
      });
    }

    await prisma.news.create({
      data: {
        title: { fr: 'Rétrospective 2025-2026', en: '2025-2026 Retrospective' },
        slug: 'retrospective-2025-2026',
        excerpt: { fr: 'Cours de vacances gratuits, kits scolaires, cantine...', en: 'Free holiday courses, school kits...' },
        content: { fr: '<p>Contenu de la rétrospective...</p>', en: '<p>Retrospective content...</p>' },
        categoryId: newsCategory.id,
        isPublished: true,
        publishedAt: new Date()
      }
    });
  }

  // 7. Donation Methods
  const donationsCount = await prisma.donationMethod.count();
  if (donationsCount === 0) {
    const donations = [
      {
        title: { fr: 'Faire un don financier', en: 'Make a financial donation' },
        description: { fr: 'Contribuez financièrement pour soutenir nos actions sur le terrain. Chaque franc compte.', en: 'Contribute financially to support our actions.' },
        actionType: 'phone',
        actionData: '+221 77 861 32 02',
        actionLabel: { fr: 'Copier le numéro', en: 'Copy number' },
        iconColor: 'orange',
        order: 1,
        isPublished: true
      },
      {
        title: { fr: 'Devenir bénévole', en: 'Become a volunteer' },
        description: { fr: 'Offrez un peu de votre temps et vos compétences pour accompagner nos activités.', en: 'Offer your time and skills.' },
        actionType: 'link',
        actionData: '/contact',
        actionLabel: { fr: 'Rejoindre l\'équipe', en: 'Join the team' },
        iconColor: 'blue',
        order: 2,
        isPublished: true
      },
      {
        title: { fr: 'Fournir du matériel', en: 'Provide materials' },
        description: { fr: 'Soutenez-nous avec du matériel scolaire, médical ou autre, selon les besoins.', en: 'Support us with school, medical or other materials.' },
        actionType: 'contact',
        actionData: '/contact',
        actionLabel: { fr: 'Nous contacter', en: 'Contact us' },
        iconColor: 'green',
        order: 3,
        isPublished: true
      }
    ];

    for (const d of donations) {
      await prisma.donationMethod.create({ data: d });
    }
  }

  console.log('Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
