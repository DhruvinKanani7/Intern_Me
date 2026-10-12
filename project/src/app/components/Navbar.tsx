import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  GraduationCap, Sun, Moon, LogOut, Menu, X, ChevronDown,
  LayoutDashboard, Briefcase, FileText, Award, CreditCard,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { cn } from "./ui/utils";
import { Page } from "../types";

export default function Navbar() {
  const { theme, toggleTheme, go, user, logout, page } = useApp();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const navLinks: { label: string; page: Page }[] = [
    { label: "Internships", page: "internships" },
    { label: "Pricing", page: "pricing" },
    { label: "About", page: "about" },
    { label: "Contact", page: "contact" },
  ];

  const isHero = page === "home";

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled || !isHero
          ? "bg-background/90 backdrop-blur-xl border-b border-border shadow-sm"
          : "bg-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <button onClick={() => go("home")} className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
            <GraduationCap className="w-4.5 h-4.5 text-white" />
          </div>
          <span
            className={cn(
              "font-display font-bold text-lg tracking-tight transition-colors",
              isHero && !scrolled ? "text-white" : "text-foreground"
            )}
          >
            intern<span className="text-primary">me</span>
          </span>
        </button>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((l) => (
            <button
              key={l.label}
              onClick={() => go(l.page)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-muted",
                isHero && !scrolled
                  ? "text-white/80 hover:text-white hover:bg-white/10"
                  : "text-muted-foreground hover:text-foreground",
                page === l.page && "text-foreground bg-muted"
              )}
            >
              {l.label}
            </button>
          ))}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            aria-label="Toggle color theme"
            className={cn(
              "p-2 rounded-lg transition-colors",
              isHero && !scrolled
                ? "text-white/80 hover:bg-white/10"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            {theme === "dark" ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
          </button>

          {user ? (
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 bg-card hover:bg-muted border border-border/80 rounded-xl text-sm font-medium transition-all shadow-sm group"
                aria-label="Open user menu"
                aria-expanded={userMenuOpen}
              >
                <div className="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center text-xs font-bold shadow-sm shadow-primary/30 group-hover:scale-105 transition-transform">
                  {user.name[0]?.toUpperCase()}
                </div>
                <span className="text-sm font-semibold text-foreground max-w-[120px] truncate">
                  {user.name.split(" ")[0]}
                </span>
                {user.role === "admin" && (
                  <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-500 border border-amber-500/30">
                    Admin
                  </span>
                )}
                <ChevronDown
                  className={cn(
                    "w-3.5 h-3.5 text-muted-foreground transition-transform duration-200",
                    userMenuOpen && "rotate-180"
                  )}
                />
              </button>

              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-64 bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl p-2 z-50 overflow-hidden"
                  >
                    {/* User info card */}
                    <div className="px-3 py-2.5 mb-1.5 bg-muted/50 rounded-xl">
                      <p className="font-semibold text-foreground text-xs truncate">{user.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">{user.email}</p>
                      <div className="mt-2 flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                          {user.role === "admin" ? "Platform Admin" : "Active Student"}
                        </span>
                      </div>
                    </div>

                    {/* Nav Links */}
                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setUserMenuOpen(false);
                          go(user.role === "admin" ? "admin" : "student");
                        }}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-muted transition-colors w-full text-left"
                      >
                        <LayoutDashboard className="w-4 h-4 text-primary" />
                        <span>Dashboard Overview</span>
                      </button>

                      {user.role !== "admin" && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setUserMenuOpen(false);
                              navigate("/student?tab=internships");
                            }}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-muted transition-colors w-full text-left"
                          >
                            <Briefcase className="w-4 h-4 text-violet-500" />
                            <span>My Internships</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setUserMenuOpen(false);
                              navigate("/student?tab=assignments");
                            }}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-muted transition-colors w-full text-left"
                          >
                            <FileText className="w-4 h-4 text-amber-500" />
                            <span>Course Assignments</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setUserMenuOpen(false);
                              navigate("/student?tab=certs");
                            }}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-muted transition-colors w-full text-left"
                          >
                            <Award className="w-4 h-4 text-emerald-500" />
                            <span>My Certificates</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setUserMenuOpen(false);
                              navigate("/student?tab=payments");
                            }}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-muted transition-colors w-full text-left"
                          >
                            <CreditCard className="w-4 h-4 text-blue-500" />
                            <span>Payment History</span>
                          </button>
                        </>
                      )}
                    </div>

                    <div className="h-px bg-border my-1.5" />

                    {/* Sign Out */}
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        logout();
                      }}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-red-500 hover:bg-red-500/10 transition-colors w-full text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={() => go("login")}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  isHero && !scrolled
                    ? "text-white hover:bg-white/10"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                Log in
              </button>
              <button
                onClick={() => go("register")}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm shadow-primary/30"
              >
                Get Started
              </button>
            </div>
          )}

          <button
            className="md:hidden p-2 rounded-lg text-muted-foreground hover:bg-muted"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-background/95 backdrop-blur-xl border-b border-border px-6 pb-4"
          >
            <div className="flex flex-col gap-1 pt-2">
              {navLinks.map((l) => (
                <button
                  key={l.label}
                  onClick={() => {
                    go(l.page);
                    setMenuOpen(false);
                  }}
                  className="px-4 py-2.5 rounded-lg text-sm font-medium text-foreground hover:bg-muted text-left transition-colors"
                >
                  {l.label}
                </button>
              ))}
              {!user && (
                <>
                  <button
                    onClick={() => {
                      go("login");
                      setMenuOpen(false);
                    }}
                    className="px-4 py-2.5 rounded-lg text-sm font-medium text-foreground hover:bg-muted text-left"
                  >
                    Log in
                  </button>
                  <button
                    onClick={() => {
                      go("register");
                      setMenuOpen(false);
                    }}
                    className="mt-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold text-center"
                  >
                    Get Started
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
