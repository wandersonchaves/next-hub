"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";

interface User {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
}

interface Organization {
  id: string;
  slug: string;
  name: string;
}

interface AuthContextType {
  isLoaded: boolean;
  isSignedIn: boolean;
  user: User | null;
  orgId: string | null;
  orgRole: string | null;
  orgSlug: string | null;
  organization: Organization | null;
  getToken: () => Promise<string | null>;
  login: (token: string, user: User, orgs: any[]) => void;
  logout: () => void;
  setOrganization: (orgId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const NativeAuthProvider = ({ children }: { children: ReactNode }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgSlug, setOrgSlug] = useState<string | null>(null);
  const [orgRole, setOrgRole] = useState<string | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const router = useRouter();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const syncAuth = () => {
      const token = Cookies.get("nexthub_token");
      const sessionStr = Cookies.get("nexthub_session");

      if (token && sessionStr) {
        try {
          const session = JSON.parse(sessionStr);
          setUser(session.user);
          setIsSignedIn(true);
          
          if (session.activeOrg) {
            // Note: organizationId is the key from backend LoginUseCase
            const active = session.activeOrg;
            setOrgId(active.organizationId || active.id); 
            setOrgSlug(active.organizationSlug || active.slug);
            setOrgRole(active.role);
            setOrganization({
               id: active.organizationId || active.id,
               slug: active.organizationSlug || active.slug,
               name: active.organizationName || active.name || 'Minha Empresa'
            });
          }
        } catch (e) {
          console.error("Auth Sync Error:", e);
        }
      }
      setIsLoaded(true);
    };

    syncAuth();
  }, []);

  const getToken = async () => {
    if (typeof window === "undefined") return null;
    return Cookies.get("nexthub_token") || null;
  };

  const login = (token: string, userObj: User, orgs: any[]) => {
    if (typeof window === "undefined") return;

    Cookies.set("nexthub_token", token, { secure: false, sameSite: "strict", expires: 7 });
    
    const activeOrg = orgs.length > 0 ? orgs[0] : null;
    const session = { user: userObj, activeOrg };
    
    Cookies.set("nexthub_session", JSON.stringify(session), { secure: false, sameSite: "strict", expires: 7 });
    
    setUser(userObj);
    setIsSignedIn(true);

    if (activeOrg) {
      setOrgId(activeOrg.organizationId || activeOrg.id);
      setOrgSlug(activeOrg.organizationSlug || activeOrg.slug);
      setOrgRole(activeOrg.role);
      setOrganization({
        id: activeOrg.organizationId || activeOrg.id,
        slug: activeOrg.organizationSlug || activeOrg.slug,
        name: activeOrg.organizationName || activeOrg.name || 'Minha Empresa'
      });
    }
    
    window.location.href = "/dashboard";
  };

  const logout = () => {
    if (typeof window === "undefined") return;

    Cookies.remove("nexthub_token");
    Cookies.remove("nexthub_session");
    setUser(null);
    setIsSignedIn(false);
    setOrgId(null);
    setOrgSlug(null);
    setOrgRole(null);
    setOrganization(null);
    
    window.location.href = "/login";
  };

  const updateOrganization = (newOrgId: string) => {
     // Implementation pending
  };

  if (!mounted) {
    return <div style={{ visibility: 'hidden' }}>{children}</div>;
  }

  return (
    <AuthContext.Provider value={{
      isLoaded,
      isSignedIn,
      user,
      orgId,
      orgRole,
      orgSlug,
      organization,
      getToken,
      login,
      logout,
      setOrganization: updateOrganization
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      isLoaded: false,
      isSignedIn: false,
      user: null,
      orgId: null,
      orgRole: null,
      orgSlug: null,
      organization: null,
      getToken: async () => null,
      login: () => {},
      logout: () => {},
      setOrganization: () => {}
    };
  }
  return context;
};

export const useUser = () => {
  const auth = useAuth();
  return { user: auth.user, isLoaded: auth.isLoaded, isSignedIn: auth.isSignedIn };
};

export const useOrganizationList = () => {
  return {
    isLoaded: true,
    userMemberships: { data: [] },
    setActive: () => {}
  }
};
