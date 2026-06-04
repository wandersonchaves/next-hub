export interface SessionMetadata {
  userId: string;
  email: string;
  memberships: {
    organizationId: string;
    organizationSlug: string;
    role: string;
    units: {
      unitId: string;
      role: string;
    }[];
  }[];
}

export interface ISessionCache {
  saveSession(token: string, metadata: SessionMetadata, ttlSeconds: number): Promise<void>;
  getSession(token: string): Promise<SessionMetadata | null>;
  revokeSession(token: string): Promise<void>;
  revokeAllUserSessions(userId: string): Promise<void>;
}

export const ISessionCacheToken = Symbol('ISessionCache');
