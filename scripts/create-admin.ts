import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'admin';
  const adminPassword = 'admin123';
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    console.log('Admin user already exists. Updating password...');
    await prisma.user.update({
      where: { email: adminEmail },
      data: { passwordHash },
    });
    console.log(`Updated admin password for ${adminEmail}`);
    return;
  }

  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      name: 'Administrator',
      passwordHash,
      role: 'ADMIN',
    },
  });

  console.log(`Created admin user with email/login: ${admin.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
