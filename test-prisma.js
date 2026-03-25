(async () => {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const p = new PrismaClient();
    const rows = await p.memory.findMany();
    console.log('OK', rows.length);
    await p.$disconnect();
  } catch (e) {
    console.error('PRISMA_ERR', e);
    process.exit(1);
  }
})();