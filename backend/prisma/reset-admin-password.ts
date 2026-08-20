/**
 * Resets the password of an administrator account.
 *
 * The seed only ever creates the first account: once it exists, changing
 * ADMIN_SEED_PASSWORD has no effect. This is the way back in when the password
 * is lost.
 *
 *   docker compose exec backend npx prisma db execute --help   # (unrelated)
 *   docker compose exec backend npm run admin:reset -- <email> <new-password>
 */
import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const [email, password] = process.argv.slice(2);

  if (!email || !password) {
    console.error('Usage: npm run admin:reset -- <email> <new-password>');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('The password must be at least 8 characters long.');
    process.exit(1);
  }

  const normalisedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalisedEmail } });

  if (!user) {
    const known = await prisma.user.findMany({
      select: { email: true, role: true, isActive: true },
      orderBy: { createdAt: 'asc' },
    });

    console.error(`No account found for "${normalisedEmail}".`);
    if (known.length) {
      console.error('Existing accounts:');
      known.forEach((u) =>
        console.error(`  - ${u.email}  (${u.role}${u.isActive ? '' : ', deactivated'})`),
      );
    } else {
      console.error('The database has no user at all. Run `npx prisma db seed`.');
    }
    process.exit(1);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await bcrypt.hash(password, 12),
      // Reactivate and re-promote, so this also recovers an account that was
      // deactivated or demoted by mistake.
      isActive: true,
      role: UserRole.SUPER_ADMIN,
      // The operator typed this password on a command line; it must be replaced.
      mustChangePassword: true,
    },
  });

  console.log(`Password updated for ${normalisedEmail}.`);
  console.log('The account is active, super administrator, and must set a new password at login.');
}

main()
  .catch((error) => {
    console.error('Reset failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
