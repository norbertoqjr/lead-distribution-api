import 'reflect-metadata';
import * as bcrypt from 'bcryptjs';
import { AppDataSource } from './data-source';
import { User } from '../entities';

async function seed(): Promise<void> {
  const email = process.env.ADMIN_EMAIL ?? 'admin@example.com';
  const password = process.env.ADMIN_PASSWORD ?? 'changeme123';

  await AppDataSource.initialize();
  const users = AppDataSource.getRepository(User);
  const passwordHash = await bcrypt.hash(password, 12);

  // Idempotent: reseeding refreshes the password instead of failing on the
  // unique email, so a forgotten local password is one command away.
  const existing = await users.findOne({ where: { email } });

  if (existing) {
    existing.passwordHash = passwordHash;
    await users.save(existing);
    console.log(`Updated admin: ${email}`);
  } else {
    await users.save(users.create({ email, passwordHash, name: 'Admin' }));
    console.log(`Created admin: ${email}`);
  }

  await AppDataSource.destroy();
}

seed().catch(async (error) => {
  console.error(error);
  if (AppDataSource.isInitialized) await AppDataSource.destroy();
  process.exit(1);
});
