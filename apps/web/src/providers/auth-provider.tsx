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

  useEffect(() => {
    // Initial load from cookies
    const token = Cookies.get("nexthub_token");
    const sessionStr = Cookies.get("nexthub_session");

    if (token && sessionStr) {
      try {
        const session = JSON.parse(sessionStr);
        setUser(session.user);
        setIsSignedIn(true);
        if (session.activeOrg) {
          setOrgId(session.activeOrg.id);
          setOrgSlug(session.activeOrg.slug);
          setOrgRole(session.activeOrg.role);
          setOrganization(session.activeOrg);
        }
      } catch (e) {
        console.error("Failed to parse session", e);
      }
    }
    setIsLoaded(true);
  }, []);

  const getToken = async () => {
    return Cookies.get("nexthub_token") || null;
  };

  const login = (token: string, userObj: User, orgs: any[]) => {
    Cookies.set("nexthub_token", token, { secure: true, sameSite: "strict", expires: 7 });
    
    const activeOrg = orgs.length > 0 ? orgs[0] : null;
    const session = { user: userObj, activeOrg };
    
    Cookies.set("nexthub_session", JSON.stringify(session), { secure: true, sameSite: "strict", expires: 7 });
    
    setUser(userObj);
    setIsSignedIn(true);
    if (activeOrg) {
      setOrgId(activeOrg.id);
      setOrgSlug(activeOrg.slug);
      setOrgRole(activeOrg.role);
      setOrganization(activeOrg);
    }
    router.push("/dashboard");
  };

  const logout = () => {
    Cookies.remove("nexthub_token");
    Cookies.remove("nexthub_session");
    setUser(null);
    setIsSignedIn(false);
    setOrgId(null);
    setOrgSlug(null);
    setOrgRole(null);
    setOrganization(null);
    router.push("/login");
  };

  const updateOrganization = (newOrgId: string) => {
     // Ideally fetch new org details and update session
     // For now, this is a placeholder for the organization switcher
  };

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
    throw new Error("useAuth must be used within a NativeAuthProvider");
  }
  return context;
};

export const useUser = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useUser must be used within a NativeAuthProvider");
  }
  return { user: context.user, isLoaded: context.isLoaded, isSignedIn: context.isSignedIn };
};

export const useOrganizationList = () => {
  return {
    isLoaded: true,
    userMemberships: { data: [] },
    setActive: () => {}
  }
};
