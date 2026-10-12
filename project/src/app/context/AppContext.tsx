import React, { createContext, useContext, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { User, Page, AppCtx } from "../types";
import { api, userStore, tokenStore } from "../lib/api";

const AppContext = createContext<AppCtx>({} as AppCtx);

export const useApp = () => useContext(AppContext);

export function pathForPage(p: Page, id?: string | null): string {
  switch (p) {
    case "home":
      return "/";
    case "internships":
      return "/internships";
    case "detail":
      return `/internships/${id ?? ""}`;
    case "login":
      return "/login";
    case "register":
      return "/register";
    case "student":
      return "/student";
    case "admin":
      return "/admin";
    case "verify":
      return id ? `/verify/${encodeURIComponent(id)}` : "/verify";
    case "about":
      return "/about";
    case "contact":
      return "/contact";
    case "pricing":
      return "/pricing";
    case "forgot-password":
      return "/forgot-password";
    case "reset-password":
      return "/reset-password";
    default:
      return "/";
  }
}

export function parsePathname(pathname: string): { page: Page; id: string | null } {
  if (pathname === "/") return { page: "home", id: null };
  if (pathname === "/internships") return { page: "internships", id: null };
  const detailMatch = pathname.match(/^\/internships\/([^/]+)\/?$/);
  if (detailMatch) return { page: "detail", id: decodeURIComponent(detailMatch[1]) };
  if (pathname === "/login") return { page: "login", id: null };
  if (pathname === "/register") return { page: "register", id: null };
  if (pathname.startsWith("/student")) return { page: "student", id: null };
  if (pathname.startsWith("/admin")) return { page: "admin", id: null };
  const verifyMatch = pathname.match(/^\/verify\/([^/]+)\/?$/);
  if (verifyMatch) return { page: "verify", id: decodeURIComponent(verifyMatch[1]) };
  if (pathname === "/verify") {
    const urlParams = new URLSearchParams(window.location.search);
    const codeParam = urlParams.get("code");
    return { page: "verify", id: codeParam };
  }
  if (pathname === "/about") return { page: "about", id: null };
  if (pathname === "/contact") return { page: "contact", id: null };
  if (pathname === "/pricing") return { page: "pricing", id: null };
  if (pathname === "/forgot-password") return { page: "forgot-password", id: null };
  if (pathname === "/reset-password") return { page: "reset-password", id: null };
  return { page: "home", id: null };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  );
  const location = useLocation();
  const navigate = useNavigate();
  const { page, id: selectedId } = parsePathname(location.pathname);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  // Restore session on page load/refresh
  useEffect(() => {
    const restoreSession = async () => {
      const cachedUser = userStore.get();
      if (cachedUser) setUser(cachedUser);

      try {
        const { user: freshUser } = await api.auth.me();
        setUser(freshUser);
        userStore.set(freshUser);
      } catch {
        tokenStore.clear();
        userStore.clear();
        setUser(null);
      }
    };
    restoreSession();
  }, []);

  const go = (p: Page, data?: { id?: string }) => {
    navigate(pathForPage(p, data?.id ?? null));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const login = (u: User, token?: string) => {
    setUser(u);
    userStore.set(u);
    if (token) tokenStore.set(token);
  };

  const logout = () => {
    void api.auth.logout();
    setUser(null);
    tokenStore.clear();
    userStore.clear();
    go("home");
  };

  const ctx: AppCtx = {
    theme,
    toggleTheme: () => setTheme((t) => (t === "light" ? "dark" : "light")),
    page,
    go,
    user,
    login,
    logout,
    selectedId,
  };

  return <AppContext.Provider value={ctx}>{children}</AppContext.Provider>;
}
