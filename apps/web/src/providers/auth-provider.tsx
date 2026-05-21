'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useUser, useAuth as useClerkAuth } from '@clerk/nextjs';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  organizationId: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user: clerkUser, isLoaded: isUserLoaded } = useUser();
  const { orgId, orgRole, isLoaded: isAuthLoaded } = useClerkAuth();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isUserLoaded && isAuthLoaded) {
      if (clerkUser) {
        setUser({
          id: clerkUser.id,
          name: clerkUser.fullName || 'User',
          email: clerkUser.primaryEmailAddress?.emailAddress || '',
          role: orgRole || 'MEMBER', // Usa a role do Clerk ou default
        });
      } else {
        setUser(null);
      }
      setIsLoading(false);
    }
  }, [clerkUser, isUserLoaded, orgId, orgRole, isAuthLoaded]);

  return (
    <AuthContext.Provider value={{ user, isLoading, organizationId: orgId || null }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
