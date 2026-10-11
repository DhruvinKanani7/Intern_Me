import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { GraduationCap, Sun, Moon, LogOut, Menu, X } from "lucide-react";
import { useApp } from "../context/AppContext";
import { cn } from "./ui/utils";
import { Page } from "../types";

export default function Navbar() {
  const { theme, toggleTheme, go, user, logout, page } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

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
            <div className="flex items-center gap-2">
              <button
                onClick={() => go(user.role === "admin" ? "admin" : "student")}
                className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">
                  {user.name[0]}
                </div>
                {user.name.split(" ")[0]}
              </button>
              <button
                onClick={logout}
                aria-label="Log out"
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  isHero && !scrolled
                    ? "text-white/60 hover:bg-white/10"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <LogOut className="w-4 h-4" />
              </button>
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
