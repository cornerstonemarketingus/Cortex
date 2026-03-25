import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/crm-client';
import { getCrmDatabaseUrl } from './env';

type CrmGlobal = {
  crmDb?: PrismaClient;
  crmAdapter?: PrismaPg;
};

const globalForCrm = global as unknown as CrmGlobal;

const crmAdapter =
  globalForCrm.crmAdapter ||
  new PrismaPg({ connectionString: getCrmDatabaseUrl() });

export const crmDb =
  globalForCrm.crmDb ||
  new PrismaClient({ adapter: crmAdapter });

if (process.env.NODE_ENV !== 'production') {
  globalForCrm.crmDb = crmDb;
  globalForCrm.crmAdapter = crmAdapter;
}
