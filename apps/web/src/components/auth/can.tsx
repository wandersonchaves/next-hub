'use client';

import React from 'react';
import { useAuth } from '../../providers/auth-provider';

type Role = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

interface CanProps {
  I: Role | Role[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function Can({ I, children, fallback = null }: CanProps) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) return null;
  
  const userRole = user?.role as Role;
  const allowedRoles = Array.isArray(I) ? I : [I];

  // Role Hierarchy
  const roleHierarchy: Record<Role, number> = {
    OWNER: 4,
    ADMIN: 3,
    MEMBER: 2,
    VIEWER: 1,
  };

  const hasAccess = allowedRoles.some(role => {
    // Exact match or higher in hierarchy if we wanted to implement that logic
    // For now, let's keep it simple: exact match in the provided list
    return userRole === role;
  });

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
