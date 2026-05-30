import { prisma } from './index.js';

async function main() {
  console.log('--- Multi-Level Access Refactor Seed (Final) ---');

  // 1. SEDE PRINCIPAL: Sua organização Admin
  const admin = await prisma.user.upsert({
    where: { email: 'wanderson.admin@nexthub.com' },
    update: {},
    create: {
      email: 'wanderson.admin@nexthub.com',
      name: 'Wanderson Admin',
      clerkId: 'user_master_admin_id' 
    },
  });

  const orgHq = await prisma.organization.upsert({
    where: { slug: 'sede-principal' },
    update: { enabledModules: ['PROSPECTOR', 'HEALTH', 'PET'] },
    create: {
      name: 'Sede Principal HQ',
      slug: 'sede-principal',
      enabledModules: ['PROSPECTOR', 'HEALTH', 'PET'],
      members: {
        create: { userId: admin.id, role: 'OWNER' }
      }
    }
  });

  await prisma.unit.upsert({
    where: { id: 'unit-master' },
    update: {},
    create: {
      id: 'unit-master',
      name: 'Unidade Central HQ',
      organizationId: orgHq.id,
      type: 'CORE',
      userPermissions: {
        create: { userId: admin.id, organizationId: orgHq.id, role: 'ORGANIZATION_ADMIN' }
      }
    }
  });

  // 2. CLIENTE A: Clínica A
  const userAdminA = await prisma.user.upsert({
    where: { email: 'admin@clinica-a.com' },
    update: {},
    create: { email: 'admin@clinica-a.com', name: 'Gestor Clínica A' }
  });

  const userRecepcaoA = await prisma.user.upsert({
    where: { email: 'recepcao@clinica-a.com' },
    update: {},
    create: { email: 'recepcao@clinica-a.com', name: 'Recepcionista A' }
  });

  const orgA = await prisma.organization.upsert({
    where: { slug: 'clinica-a' },
    update: { enabledModules: ['HEALTH'] },
    create: {
      name: 'Clínica A',
      slug: 'clinica-a',
      enabledModules: ['HEALTH'],
      members: {
        createMany: {
          data: [
            { userId: userAdminA.id, role: 'ADMIN' },
            { userId: userRecepcaoA.id, role: 'MEMBER' }
          ]
        }
      }
    }
  });

  await prisma.unit.create({
    data: {
      name: 'Sede Clínica A',
      organizationId: orgA.id,
      type: 'HEALTH',
      userPermissions: {
        createMany: {
          data: [
            { userId: userAdminA.id, organizationId: orgA.id, role: 'UNIT_MANAGER' },
            { userId: userRecepcaoA.id, organizationId: orgA.id, role: 'OPERATIONAL_STAFF' }
          ]
        }
      }
    }
  });

  // 3. CLIENTE B: Clínica B -> [PROSPECTOR, HEALTH]
  const orgB = await prisma.organization.upsert({
    where: { slug: 'clinica-b' },
    update: { enabledModules: ['PROSPECTOR', 'HEALTH'] },
    create: {
      name: 'Clínica B',
      slug: 'clinica-b',
      enabledModules: ['PROSPECTOR', 'HEALTH']
    }
  });

  await prisma.unit.create({
    data: {
      name: 'Sede Clínica B',
      organizationId: orgB.id,
      type: 'HEALTH'
    }
  });

  // 4. CLIENTE C: Clínica Otorrino -> [HEALTH]
  await prisma.organization.upsert({
    where: { slug: 'clinica-otorrino' },
    update: { enabledModules: ['HEALTH'] },
    create: {
      name: 'Clínica Otorrino',
      slug: 'clinica-otorrino',
      enabledModules: ['HEALTH']
    }
  });

  // 5. CLIENTE D: Saúde Pet -> [PET]
  const orgD = await prisma.organization.upsert({
    where: { slug: 'saude-pet' },
    update: { enabledModules: ['PET'] },
    create: {
      name: 'Saúde Pet',
      slug: 'saude-pet',
      enabledModules: ['PET']
    }
  });

  await prisma.unit.create({
    data: {
      name: 'Matriz Saúde Pet',
      organizationId: orgD.id,
      type: 'PET'
    }
  });

  // 6. CLIENTE E: Pet Dirceu -> [PET]
  await prisma.organization.upsert({
    where: { slug: 'pet-dirceu' },
    update: { enabledModules: ['PET'] },
    create: {
      name: 'Pet Dirceu',
      slug: 'pet-dirceu',
      enabledModules: ['PET']
    }
  });

  console.log('Final multi-level seed applied.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
