import { prisma } from './index.js';

async function main() {
  console.log('--- Multi-Level Access Refactor Seed (Idempotent v5) ---');

  // 1. MASTER ADMIN & HQ
  const admin = await prisma.user.upsert({
    where: { email: 'wanderson.admin@nexthub.com' },
    update: {},
    create: {
      email: 'wanderson.admin@nexthub.com',
      name: 'Wanderson Admin',
      clerkId: 'user_master_admin_id' 
    },
  });

  const hq = await prisma.organization.upsert({
    where: { slug: 'nexthub-core' },
    update: { 
      enabledModules: ['PROSPECTOR', 'HEALTH', 'PET'],
      status: 'ACTIVE'
    },
    create: {
      name: 'NextHub Core',
      slug: 'nexthub-core',
      enabledModules: ['PROSPECTOR', 'HEALTH', 'PET'],
      status: 'ACTIVE',
      members: {
        create: {
          userId: admin.id,
          role: 'OWNER',
        },
      },
    },
  });

  await prisma.unit.upsert({
    where: { id: 'unit-hq-master' },
    update: {},
    create: {
      id: 'unit-hq-master',
      name: 'Sede Principal HQ',
      organizationId: hq.id,
      type: 'CORE',
      userPermissions: {
        create: {
          userId: admin.id,
          organizationId: hq.id,
          role: 'ORGANIZATION_ADMIN'
        }
      }
    }
  });

  // 2. CLIENTE A: Clínica A [HEALTH]
  const adminA = await prisma.user.upsert({
    where: { email: 'admin@clinica-a.com' },
    update: {},
    create: { email: 'admin@clinica-a.com', name: 'Dr. Silva (Admin A)' }
  });

  const recepcaoA = await prisma.user.upsert({
    where: { email: 'recepcao@clinica-a.com' },
    update: {},
    create: { email: 'recepcao@clinica-a.com', name: 'Maria (Recepção A)' }
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
            { userId: adminA.id, role: 'ADMIN' },
            { userId: recepcaoA.id, role: 'MEMBER' }
          ]
        }
      }
    }
  });

  await prisma.unit.upsert({
    where: { id: 'unit-clinica-a' },
    update: {},
    create: {
      id: 'unit-clinica-a',
      name: 'Sede Clínica A',
      organizationId: orgA.id,
      type: 'HEALTH',
      userPermissions: {
        createMany: {
          data: [
            { userId: adminA.id, organizationId: orgA.id, role: 'UNIT_MANAGER' },
            { userId: recepcaoA.id, organizationId: orgA.id, role: 'OPERATIONAL_STAFF' }
          ]
        }
      }
    }
  });

  // 3. SUSPENDED CLIENT: Clínica em Atraso [HEALTH]
  const userSuspended = await prisma.user.upsert({
    where: { email: 'financeiro@atraso.com' },
    update: {},
    create: { email: 'financeiro@atraso.com', name: 'Devedor' }
  });

  const orgSuspended = await prisma.organization.upsert({
    where: { slug: 'clinica-suspendida' },
    update: { status: 'SUSPENDED', enabledModules: ['HEALTH'] },
    create: {
      name: 'Clínica Inadimplente',
      slug: 'clinica-suspendida',
      status: 'SUSPENDED',
      enabledModules: ['HEALTH'],
      members: {
        create: { userId: userSuspended.id, role: 'OWNER' }
      }
    }
  });

  await prisma.unit.upsert({
    where: { id: 'unit-suspensa' },
    update: {},
    create: {
      id: 'unit-suspensa',
      name: 'Unidade Bloqueada',
      organizationId: orgSuspended.id,
      type: 'HEALTH',
      userPermissions: {
        create: {
          userId: userSuspended.id,
          organizationId: orgSuspended.id,
          role: 'ORGANIZATION_ADMIN'
        }
      }
    }
  });

  console.log('Seed v5 applied successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
