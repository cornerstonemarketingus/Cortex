import { jwtVerify, SignJWT } from 'jose';
import { ApiError } from './api';
import { getCrmJwtSecret } from './env';

const JWT_ALG = 'HS256';
const secret = new TextEncoder().encode(getCrmJwtSecret());

export type CrmAuthClaims = {
  sub: string;
  role: 'admin' | 'agent' | 'viewer';
  email?: string;
  name?: string;
  tenantId?: string;
};

export async function issueCrmToken(
  claims: CrmAuthClaims,
  expiresIn: string | number = '8h'
): Promise<string> {
  return new SignJWT({
    role: claims.role,
    email: claims.email,
    name: claims.name,
    tenantId: claims.tenantId,
  })
    .setProtectedHeader({ alg: JWT_ALG })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret);
}

export async function verifyCrmToken(token: string): Promise<CrmAuthClaims> {
  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: [JWT_ALG],
    });

    if (typeof payload.sub !== 'string') {
      throw new ApiError(401, 'Invalid auth token subject', 'INVALID_TOKEN');
    }

    const roleRaw = payload.role;
    const role = roleRaw === 'admin' || roleRaw === 'agent' || roleRaw === 'viewer'
      ? roleRaw
      : 'viewer';

    return {
      sub: payload.sub,
      role,
      email: typeof payload.email === 'string' ? payload.email : undefined,
      name: typeof payload.name === 'string' ? payload.name : undefined,
      tenantId: typeof payload.tenantId === 'string' ? payload.tenantId : undefined,
    };
  } catch {
    throw new ApiError(401, 'Invalid or expired auth token', 'INVALID_TOKEN');
  }
}

export function getBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;

  const [scheme, token] = authHeader.split(' ');
  if (!scheme || !token || scheme.toLowerCase() !== 'bearer') {
    return null;
  }

  return token;
}

export async function requireCrmAuth(request: Request): Promise<CrmAuthClaims> {
  const token = getBearerToken(request);
  if (!token) {
    throw new ApiError(401, 'Missing bearer token', 'MISSING_TOKEN');
  }

  return verifyCrmToken(token);
}

export async function requireCrmAdmin(request: Request): Promise<CrmAuthClaims> {
  const claims = await requireCrmAuth(request);
  if (claims.role !== 'admin') {
    throw new ApiError(403, 'Admin role required', 'FORBIDDEN');
  }
  return claims;
}
