import 'dotenv/config';
import { connectDB } from '../config/database';
import User from '../models/User.model';

async function seed() {
  await connectDB();

  // Admin
  const adminExists = await User.findOne({ email: 'admin@biomedicalqa.com' });
  if (!adminExists) {
    await User.create({
      fullName: 'System Admin',
      email: 'admin@biomedicalqa.com',
      password: 'Admin@12345',
      role: 'admin',
    });
    console.log('Admin: admin@biomedicalqa.com / Admin@12345');
  } else {
    console.log('Admin already exists');
  }

  // Demo user
  const userExists = await User.findOne({ email: 'demo@biomedicalqa.com' });
  if (!userExists) {
    await User.create({
      fullName: 'Demo User',
      email: 'demo@biomedicalqa.com',
      password: 'Demo@12345',
      role: 'user',
    });
    console.log('User: demo@biomedicalqa.com / Demo@12345');
  } else {
    console.log('Demo user already exists');
  }

  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
