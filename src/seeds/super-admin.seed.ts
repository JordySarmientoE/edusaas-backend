import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import dataSource from '../config/typeorm-cli.config';
import { Role } from '../common/enums/role.enum';
import { User } from '../users/entities/user.entity';

function getArg(name: string): string | undefined {
  return process.argv.find((arg) => arg.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
}

async function run(): Promise<void> {
  const email = getArg('email');
  const password = getArg('password');
  const firstName = getArg('firstName') ?? 'Super';
  const lastName = getArg('lastName') ?? 'Admin';

  if (!email || !password) {
    throw new Error('Uso: npm run seed:super-admin -- --email=admin@dominio.com --password=TuPasswordSegura');
  }

  await dataSource.initialize();
  const usersRepository = dataSource.getRepository(User);

  const existing = await usersRepository.findOne({ where: { email } });
  if (existing) {
    console.log(`Super admin ya existe para ${email}`);
    await dataSource.destroy();
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const superAdmin = usersRepository.create({
    schoolId: null,
    firstName,
    lastName,
    email,
    passwordHash,
    role: Role.SUPER_ADMIN,
    isActive: true,
    refreshTokenHash: null
  });

  await usersRepository.save(superAdmin);
  console.log(`Super admin creado: ${email}`);
  await dataSource.destroy();
}

void run().catch(async (error: unknown) => {
  console.error(error);
  if (dataSource.isInitialized) {
    await dataSource.destroy();
  }
  process.exit(1);
});
