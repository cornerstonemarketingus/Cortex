import { connectDomainToProject, getHostedProject, registerDomainOrder } from '@/src/hosting/private-hosting';

async function main() {
  const domain = (process.env.DOMAIN_TO_CONNECT || '').trim().toLowerCase();
  const projectId = (process.env.HOSTING_PROJECT_ID || '').trim();
  const contactEmail = (process.env.DOMAIN_CONTACT_EMAIL || '').trim();

  if (!domain) {
    throw new Error('Missing DOMAIN_TO_CONNECT');
  }

  if (!projectId) {
    throw new Error('Missing HOSTING_PROJECT_ID');
  }

  const project = await getHostedProject(projectId);
  if (!project) {
    throw new Error(`Hosted project not found: ${projectId}`);
  }

  const order = await registerDomainOrder({
    domain,
    provider: 'manual-dns',
    projectId,
    contactEmail: contactEmail || undefined,
  });

  const connection = await connectDomainToProject({
    domain,
    provider: 'manual-dns',
    projectId,
  });

  console.log('Domain order created:');
  console.log(JSON.stringify(order, null, 2));
  console.log('');
  console.log('Domain connection created:');
  console.log(JSON.stringify(connection, null, 2));
  console.log('');
  console.log(`Production target: ${project.deployment?.productionUrl || 'n/a'}`);
}

main().catch((error) => {
  console.error('Domain connect failed');
  console.error(error);
  process.exit(1);
});
