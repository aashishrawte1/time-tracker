import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api, getToken, setToken, clearToken } from "../api/client";
import type { OrgRole, Organization, User } from "../types";

interface AuthResponse {
  token: string;
  user: User;
  organization: Organization;
  role: OrgRole;
}

interface AuthContextValue {
  user: User | null;
  organization: Organization | null;
  role: OrgRole | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  applySession: (session: AuthResponse) => void;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [role, setRole] = useState<OrgRole | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshMe() {
    const res = await api.get<{ user: User; organization: Organization; role: OrgRole }>("/auth/me");
    setUser(res.user);
    setOrganization(res.organization);
    setRole(res.role);
  }

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    refreshMe()
      .catch(() => clearToken())
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applySession(session: AuthResponse) {
    setToken(session.token);
    setUser(session.user);
    setOrganization(session.organization);
    setRole(session.role);
  }

  async function login(email: string, password: string) {
    const res = await api.post<AuthResponse>("/auth/login", { email, password });
    applySession(res);
  }

  async function register(email: string, password: string, name: string) {
    const res = await api.post<AuthResponse>("/auth/register", { email, password, name });
    applySession(res);
  }

  function logout() {
    clearToken();
    setUser(null);
    setOrganization(null);
    setRole(null);
  }

  return (
    <AuthContext.Provider
      value={{ user, organization, role, loading, login, register, logout, applySession, refreshMe }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
