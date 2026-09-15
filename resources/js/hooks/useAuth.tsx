import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from "react";

import api, { setMemoryToken } from "@/api/client";
import i18n, { LANG_STORAGE_KEY, SUPPORTED_LANGUAGES } from "@/i18n";

export type AppRole = "admin" | "mechanic" | "supervisor" | "store_clerk" | "qc_inspector";

export interface ProfileShape {
  full_name: string;
  employee_id: string | null;
  department: string | null;
  preferred_language?: string | null;
  parts_export_columns?: Record<string, boolean> | null;
  parts_history_location_filter?: string | null;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  roles: AppRole[];
  permissions: string[];
  profile: ProfileShape | null;
}

interface AuthContextType {
  user: AuthUser | null;
  profile: ProfileShape | null;
  roles: AppRole[];
  hasRole: (role: AppRole) => boolean;
  hasPermission: (permission: string) => boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updatePartsExportColumns: (cols: Record<string, boolean>) => Promise<void>;
  updatePartsHistoryLocationFilter: (value: string | null) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function applyLanguage(lng: string | null | undefined) {
  if (!lng) return;
  if (!SUPPORTED_LANGUAGES.some((l) => l.code === lng)) return;
  if (i18n.language !== lng) {
    void i18n.changeLanguage(lng);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const langHandlerRef = useRef<((lng: string) => void) | null>(null);
  const lastPatchedLangRef = useRef<string | null>(null);

  const fetchMe = async (): Promise<AuthUser | null> => {
    try {
      const res = await api.get<{ data: AuthUser }>("/auth/me");
      return res.data.data ?? res.data as unknown as AuthUser;
    } catch {
      return null;
    }
  };

  const refreshUser = async () => {
    const me = await fetchMe();
    setUser(me);
    if (me?.profile?.preferred_language) {
      lastPatchedLangRef.current = me.profile.preferred_language;
      applyLanguage(me.profile.preferred_language);
    }
  };

  useEffect(() => {
    // On mount, check if we have a valid session via cookie (Sanctum SPA)
    refreshUser().finally(() => setLoading(false));
  }, []);

  // Persist language preference to profile on language change
  useEffect(() => {
    if (langHandlerRef.current) {
      i18n.off("languageChanged", langHandlerRef.current);
    }

    const handler = async (lng: string) => {
      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(LANG_STORAGE_KEY, lng);
        }
      } catch { /* ignore */ }

      if (!user) return;
      if (user.profile?.preferred_language === lng) return;
      if (lastPatchedLangRef.current === lng) return;

      lastPatchedLangRef.current = lng;

      try {
        await api.patch("/profile", { preferred_language: lng });
        setUser((u) => u ? { ...u, profile: u.profile ? { ...u.profile, preferred_language: lng } : null } : u);
      } catch { /* best-effort */ }
    };

    langHandlerRef.current = handler;
    i18n.on("languageChanged", handler);

    return () => {
      if (langHandlerRef.current) {
        i18n.off("languageChanged", langHandlerRef.current);
      }
    };
  }, [user]);

  const signIn = async (email: string, password: string): Promise<{ error: Error | null }> => {
    try {
      // First get CSRF cookie (Sanctum SPA auth)
      await api.get("/sanctum/csrf-cookie", { baseURL: window.location.origin });
      const res = await api.post<{ data: { token?: string; user: AuthUser } }>("/auth/login", { email, password });
      const token = (res.data as any).token ?? (res.data as any).data?.token;
      if (token) {
        setMemoryToken(token);
      }
      const authUser = (res.data as any).user ?? (res.data as any).data?.user ?? res.data as unknown as AuthUser;
      setUser(authUser);
      if (authUser.profile) applyLanguage(authUser.profile.preferred_language);
      return { error: null };
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Login failed";
      return { error: new Error(msg) };
    }
  };

  const signOut = async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      setMemoryToken(null);
      setUser(null);
    }
  };

  const hasRole = (role: AppRole) => user?.roles.includes(role) ?? false;

  const hasPermission = (permission: string) => user?.permissions.includes(permission) ?? false;

  const profile = user?.profile ?? null;
  const roles: AppRole[] = user?.roles ?? [];

  const updatePartsExportColumns = useCallback(async (cols: Record<string, boolean>) => {
    if (!user) return;
    try {
      await api.patch("/profile", { parts_export_columns: cols });
      setUser((u) => u ? { ...u, profile: u.profile ? { ...u.profile, parts_export_columns: cols } : null } : u);
    } catch { /* best-effort */ }
  }, [user]);

  const updatePartsHistoryLocationFilter = useCallback(async (value: string | null) => {
    if (!user) return;
    try {
      await api.patch("/profile", { parts_history_location_filter: value });
      setUser((u) => u ? { ...u, profile: u.profile ? { ...u.profile, parts_history_location_filter: value } : null } : u);
    } catch { /* best-effort */ }
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, profile, roles, hasRole, hasPermission, loading, signIn, signOut, updatePartsExportColumns, updatePartsHistoryLocationFilter, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
