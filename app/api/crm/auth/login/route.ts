import { createHash } from 'node:crypto';
import { readJson } from '@/src/crm/core/api';
import { crmDb } from '@/src/crm/core/crmDb';
import { issueCrmToken } from '@/src/crm/core/auth';
import { parseOptionalString, withApiHandler, jsonResponse } from '@/src/crm/core/http';

export const runtime = 'nodejs';

type LoginBody = {
  email?: string;
  password?: string;
  tenantId?: string;
};

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function verifyPassword(storedPasswordHash: string | null | undefined, password: string) {
  if (!storedPasswordHash) {
    return false;
  }

  if (storedPasswordHash.startsWith('plain:')) {
    return storedPasswordHash.slice('plain:'.length) === password;
  }

  if (storedPasswordHash.startsWith('sha256:')) {
    return storedPasswordHash.slice('sha256:'.length) === sha256(password);
  }

  return storedPasswordHash === password;
}

function normalizeRole(rawRole: string | null | undefined): 'admin' | 'agent' | 'viewer' {
  if (rawRole === 'admin' || rawRole === 'agent' || rawRole === 'viewer') {
    return rawRole;
  }
  return 'viewer';
}

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const body = await readJson<LoginBody>(request);
    const email = parseOptionalString(body.email)?.toLowerCase();
    const password = parseOptionalString(body.password);
    const tenantId =
      parseOptionalString(body.tenantId) ||
      parseOptionalString(request.headers.get('x-tenant-id') || undefined) ||
      parseOptionalString(process.env.CRM_DEFAULT_TENANT_ID) ||
      'cortex-default';

    if (!email || !password) {
      return jsonResponse({ error: 'email and password are required' }, 400);
    }

    const user = await crmDb.crmUser.findUnique({
      where: { email },
    });

    if (user && verifyPassword(user.passwordHash, password)) {
      const role = normalizeRole(user.role);
      const token = await issueCrmToken(
        {
          sub: user.id,
          role,
          email: user.email,
          name: user.fullName,
          tenantId,
        },
        '8h'
      );

      return jsonResponse({
        token,
        tokenType: 'Bearer',
        expiresIn: '8h',
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role,
        },
      });
    }

    const fallbackEmail = (process.env.CRM_ADMIN_EMAIL || 'admin@cortex.local').toLowerCase();
    const fallbackPassword = process.env.CRM_ADMIN_PASSWORD || 'devpass123';

    if (email !== fallbackEmail || password !== fallbackPassword) {
      return jsonResponse({ error: 'Invalid credentials' }, 401);
    }

    const fallbackName = process.env.CRM_ADMIN_NAME || 'CRM Admin';
    const token = await issueCrmToken(
      {
        sub: 'crm-admin-env',
        role: 'admin',
        email: fallbackEmail,
        name: fallbackName,
          tenantId,
      },
      '8h'
    );

    return jsonResponse({
      token,
      tokenType: 'Bearer',
      expiresIn: '8h',
      user: {
        id: 'crm-admin-env',
        email: fallbackEmail,
        fullName: fallbackName,
        role: 'admin',
      },
    });
  });
}
