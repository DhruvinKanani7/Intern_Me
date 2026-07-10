import React, { useState, useEffect, createContext, useContext } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  GraduationCap, Award, BookOpen, Users, TrendingUp, Star,
  CheckCircle, Clock, ArrowRight, Search, Moon, Sun, Bell,
  Menu, X, Download, QrCode, BarChart3, FileText, Settings,
  LogOut, Home, Briefcase, CreditCard, Shield, Mail, Lock,
  Eye, EyeOff, ChevronRight, Zap, Globe, MessageSquare,
  Phone, Copy, Filter, ChevronDown, Loader2, Code2,
  Database, Smartphone, PenTool, DollarSign, UserCheck,
  Check, Target, PlayCircle, HelpCircle, Sparkles, ArrowUpRight,
  Layers, MoreHorizontal, Calendar, AlertCircle, Hash,
  Building2, MapPin, ExternalLink, RefreshCw, Trophy, Edit3,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from "recharts";
import { api, tokenStore, userStore, ApiError } from "./lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────
type Page =
  | "home" | "internships" | "detail" | "login" | "register"
  | "student" | "admin" | "verify" | "about" | "contact" | "pricing";
type StudentTab = "overview" | "internships" | "assignments" | "certs" | "payments" | "profile";
type AdminTab = "overview" | "students" | "programs" | "certs" | "payments";

interface User {
  id: string;
  name: string;
  email: string;
  role: "student" | "admin";
  enrollment_no?: string;
  college_name?: string;
  course?: string;
  year_of_study?: number;
}

interface Internship {
  id: string; title: string; category: string; duration: string;
  price: number; originalPrice?: number; level: string;
  enrolled: number; rating: number; reviews: number;
  description: string; skills: string[]; image: string; badge?: string;
  modules?: number; projects?: number;
}

const TESTIMONIALS = [
  {
    name: "Priya Sharma", role: "Frontend Developer at TCS", rating: 5,
    text: "The QR-verified certificate impressed every single interviewer. RedNotice Academy gave me real project experience that no bootcamp could match.",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&auto=format",
    program: "Full Stack Web Development",
  },
  {
    name: "Arjun Mehta", role: "Data Analyst at Flipkart", rating: 5,
    text: "Incredibly comprehensive Data Science program. The hands-on ML projects and verified certificate opened doors I never expected fresh out of college.",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&auto=format",
    program: "Data Science & ML",
  },
  {
    name: "Sneha Patel", role: "UI/UX Designer at Infosys", rating: 5,
    text: "Built a complete design portfolio in 2 months. My Figma projects from this internship landed me my dream job right after graduation.",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&auto=format",
    program: "UI/UX Design & Prototyping",
  },
  {
    name: "Rahul Gupta", role: "Growth Manager at Razorpay", rating: 5,
    text: "Real campaign experience with actual budgets and analytics data. The experience letter was a huge differentiator throughout my entire job search.",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&auto=format",
    program: "Digital Marketing & Growth",
  },
];

const FAQS = [
  { q: "Are these certificates recognized by companies?", a: "Yes — each certificate has a unique QR code employers can scan instantly to verify authenticity on our public verification portal." },
  { q: "What certificates do I receive upon completion?", a: "You receive an Internship Completion Certificate, a Project Certificate for each completed project, and an Experience Letter based on your performance." },
  { q: "Is the internship self-paced?", a: "Yes. All programs are self-paced with flexible deadlines. Recommended weekly milestones help you stay on track without pressure." },
  { q: "What is the refund policy?", a: "Full refund within 7 days of purchase. Partial refund within 30 days if less than 30% of the program is completed. No questions asked." },
  { q: "What payment methods are accepted?", a: "All major credit/debit cards, UPI, net banking, and wallets via secure Razorpay integration. EMI options are available on select programs." },
  { q: "How does QR certificate verification work?", a: "Visit our verification page, enter the Certificate ID or scan the QR code. The system instantly confirms validity, student name, program, and issue date." },
];

const CATEGORIES = ["All", "Technology", "Design", "Data", "Marketing", "Security"];

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Context ───────────────────────────────────────────────────────────────────
interface AppCtx {
  theme: "light" | "dark"; toggleTheme: () => void;
  page: Page; go: (p: Page, data?: { id?: string }) => void;
  user: User | null; login: (u: User, token?: string) => void; logout: () => void;
  selectedId: string | null;
}
const AppCtx = createContext<AppCtx>({} as AppCtx);
const useApp = () => useContext(AppCtx);

// ── Tiny Helpers ──────────────────────────────────────────────────────────────
function cn(...cls: (string | false | undefined)[]) { return cls.filter(Boolean).join(" "); }

function Badge({ children, color = "violet" }: { children: React.ReactNode; color?: "violet" | "green" | "amber" | "red" | "blue" | "slate" }) {
  const map: Record<string, string> = {
    violet: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
    green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    red: "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    slate: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  };
  return <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide", map[color])}>{children}</span>;
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={cn("w-3.5 h-3.5", i <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-gray-300 dark:text-gray-600")} />
      ))}
    </div>
  );
}

function formatDate(value?: string | Date | null) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function enrollmentId(enrollment: any) {
  return enrollment?._id || enrollment?.id;
}

function enrollmentInternship(enrollment: any) {
  return enrollment?.internship_id || enrollment?.internship || {};
}

function enrollmentTitle(enrollment: any) {
  const internship = enrollmentInternship(enrollment);
  return internship?.category_name || internship?.title || "Internship";
}

function enrollmentCode(enrollment: any) {
  const internship = enrollmentInternship(enrollment);
  return internship?.category_code || internship?.id || "";
}

function enrollmentProgress(enrollment: any) {
  const current = Math.max(1, Number(enrollment?.current_task || 1));
  const total = Math.max(1, Number(enrollment?.total_tasks || 1));
  const completed = Math.min(total, Math.max(0, current - 1));
  return {
    completed,
    total,
    percentage: Math.round((completed / total) * 100),
  };
}

function statusColor(status?: string): "green" | "amber" | "red" | "blue" | "slate" | "violet" {
  if (status === "completed" || status === "approved" || status === "paid") return "green";
  if (status === "pending" || status === "current" || status === "active" || status === "created") return "amber";
  if (status === "rejected" || status === "failed" || status === "expired") return "red";
  if (status === "locked") return "slate";
  return "blue";
}

declare global {
  interface Window {
    Razorpay?: new (options: any) => { open: () => void };
  }
}

function loadRazorpayScript() {
  return new Promise<boolean>((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(true), { once: true });
      existing.addEventListener("error", () => resolve(false), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function ProgressRing({ pct, size = 64, stroke = 5 }: { pct: number; size?: number; stroke?: number }) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-border" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-primary transition-all duration-700"
        strokeDasharray={circ} strokeDashoffset={circ - (pct / 100) * circ} strokeLinecap="round" />
    </svg>
  );
}

function Spin() { return <Loader2 className="w-5 h-5 animate-spin" />; }

// ── Navbar ────────────────────────────────────────────────────────────────────
function Navbar() {
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
    <nav className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
      scrolled || !isHero
        ? "bg-background/90 backdrop-blur-xl border-b border-border shadow-sm"
        : "bg-transparent",
    )}>
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <button onClick={() => go("home")} className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
            <GraduationCap className="w-4.5 h-4.5 text-white" />
          </div>
          <span className={cn(
            "font-display font-bold text-lg tracking-tight transition-colors",
            isHero && !scrolled ? "text-white" : "text-foreground",
          )}>
            intern<span className="text-primary">me</span>
          </span>
        </button>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((l) => (
            <button key={l.label} onClick={() => go(l.page)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-muted",
                isHero && !scrolled ? "text-white/80 hover:text-white hover:bg-white/10" : "text-muted-foreground hover:text-foreground",
                page === l.page && "text-foreground bg-muted",
              )}>
              {l.label}
            </button>
          ))}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <button onClick={toggleTheme}
            className={cn(
              "p-2 rounded-lg transition-colors",
              isHero && !scrolled ? "text-white/80 hover:bg-white/10" : "text-muted-foreground hover:bg-muted",
            )}>
            {theme === "dark" ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
          </button>

          {user ? (
            <div className="flex items-center gap-2">
              <button onClick={() => go(user.role === "admin" ? "admin" : "student")}
                className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors">
                <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">
                  {user.name[0]}
                </div>
                {user.name.split(" ")[0]}
              </button>
              <button onClick={logout}
                className={cn("p-2 rounded-lg transition-colors", isHero && !scrolled ? "text-white/60 hover:bg-white/10" : "text-muted-foreground hover:bg-muted")}>
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <button onClick={() => go("login")}
                className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-colors", isHero && !scrolled ? "text-white hover:bg-white/10" : "text-muted-foreground hover:bg-muted")}>
                Log in
              </button>
              <button onClick={() => go("register")}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm shadow-primary/30">
                Get Started
              </button>
            </div>
          )}

          <button className="md:hidden p-2 rounded-lg text-muted-foreground hover:bg-muted" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-background/95 backdrop-blur-xl border-b border-border px-6 pb-4">
            <div className="flex flex-col gap-1 pt-2">
              {navLinks.map((l) => (
                <button key={l.label} onClick={() => { go(l.page); setMenuOpen(false); }}
                  className="px-4 py-2.5 rounded-lg text-sm font-medium text-foreground hover:bg-muted text-left transition-colors">
                  {l.label}
                </button>
              ))}
              {!user && (
                <>
                  <button onClick={() => { go("login"); setMenuOpen(false); }}
                    className="px-4 py-2.5 rounded-lg text-sm font-medium text-foreground hover:bg-muted text-left">
                    Log in
                  </button>
                  <button onClick={() => { go("register"); setMenuOpen(false); }}
                    className="mt-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold text-center">
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

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer() {
  const { go } = useApp();
  return (
    <footer className="border-t border-border bg-background mt-24">
      <div className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
              <GraduationCap className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight">intern<span className="text-primary">me</span></span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
            RedNotice Academy&apos;s premium internship platform. Real programs, real projects, real certificates — verified by employers nationwide.
          </p>
          <div className="flex items-center gap-3 mt-6">
            {["Twitter", "LinkedIn", "Instagram", "YouTube"].map((s) => (
              <button key={s} className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors">
                <Globe className="w-4 h-4" />
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground mb-4">Platform</p>
          <div className="flex flex-col gap-3">
            {[
              { label: "Browse Internships", page: "internships" as Page },
              { label: "Pricing", page: "pricing" as Page },
              { label: "Verify Certificate", page: "verify" as Page },
              { label: "About Us", page: "about" as Page },
            ].map((l) => (
              <button key={l.label} onClick={() => go(l.page)} className="text-sm text-muted-foreground hover:text-primary transition-colors text-left">{l.label}</button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground mb-4">Legal</p>
          <div className="flex flex-col gap-3">
            {["Privacy Policy", "Terms of Service", "Refund Policy", "Contact Us"].map((l) => (
              <button key={l} onClick={() => go("contact")} className="text-sm text-muted-foreground hover:text-primary transition-colors text-left">{l}</button>
            ))}
          </div>
          <div className="mt-6 p-3 bg-muted rounded-xl">
            <p className="text-xs text-muted-foreground">
              <Mail className="w-3 h-3 inline mr-1" />
              hello@rednoticeacademy.com
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              <Phone className="w-3 h-3 inline mr-1" />
              +91 98765 43210
            </p>
          </div>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">© 2024 RedNotice Academy. All rights reserved.</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Shield className="w-3 h-3" /> Payments secured by Razorpay
          </p>
        </div>
      </div>
    </footer>
  );
}

// ── Internship Card ───────────────────────────────────────────────────────────
function InternshipCard({ intern }: { intern: Internship }) {
  const { go } = useApp();
  const levelColor: Record<string, "green" | "amber" | "red"> = { Beginner: "green", Intermediate: "amber", Advanced: "red" };
  return (
    <motion.div whileHover={{ y: -4, shadow: "0 20px 40px rgba(0,0,0,0.1)" }} transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="bg-card border border-border rounded-2xl overflow-hidden group cursor-pointer flex flex-col hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300"
      onClick={() => go("detail", { id: intern.id })}>
      <div className="relative overflow-hidden bg-muted" style={{ paddingBottom: "60%" }}>
        <img src={intern.image} alt={intern.title}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        {intern.badge && (
          <div className="absolute top-3 left-3">
            <Badge color="amber">{intern.badge}</Badge>
          </div>
        )}
        <div className="absolute top-3 right-3">
          <Badge color={levelColor[intern.level] || "slate"}>{intern.level}</Badge>
        </div>
      </div>
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-2">
          <Badge color="violet">{intern.category}</Badge>
          <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{intern.duration}</span>
        </div>
        <h3 className="font-display font-semibold text-base text-foreground mb-2 leading-snug group-hover:text-primary transition-colors">{intern.title}</h3>
        <p className="text-xs text-muted-foreground line-clamp-2 mb-4 leading-relaxed">{intern.description}</p>
        <div className="flex items-center gap-2 mb-4">
          <StarRow rating={intern.rating} />
          <span className="text-xs font-semibold text-foreground">{intern.rating}</span>
          <span className="text-xs text-muted-foreground">({intern.reviews.toLocaleString()} reviews)</span>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {intern.skills.slice(0, 3).map((s) => (
            <span key={s} className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded-md">{s}</span>
          ))}
          {intern.skills.length > 3 && <span className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded-md">+{intern.skills.length - 3}</span>}
        </div>
        <div className="mt-auto flex items-center justify-between">
          <div>
            <span className="text-xl font-bold text-foreground">₹{intern.price.toLocaleString()}</span>
            {intern.originalPrice && (
              <span className="ml-2 text-sm text-muted-foreground line-through">₹{intern.originalPrice.toLocaleString()}</span>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="w-3.5 h-3.5" />
            {intern.enrolled.toLocaleString()}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Landing Page ──────────────────────────────────────────────────────────────
function LandingPage() {
  const { go } = useApp();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [featuredInternships, setFeaturedInternships] = useState<Internship[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);

  useEffect(() => {
    api.internships.getAll()
      .then((data) => setFeaturedInternships((data || []).slice(0, 6)))
      .catch(() => setFeaturedInternships([]))
      .finally(() => setFeaturedLoading(false));
  }, []);

  const stats = [
    { value: "10K+", label: "Students Enrolled", icon: Users },
    { value: "52", label: "Internship Programs", icon: Briefcase },
    { value: "8K+", label: "Certificates Issued", icon: Award },
    { value: "4.8★", label: "Average Rating", icon: Star },
  ];

  const howItWorks = [
    { step: "01", title: "Browse & Enroll", desc: "Explore 52+ programs, compare pricing, and securely enroll with Razorpay in minutes.", icon: Search },
    { step: "02", title: "Learn & Build", desc: "Complete modules, assignments, quizzes, and build real projects at your own pace.", icon: Code2 },
    { step: "03", title: "Get Certified", desc: "Earn QR-verified certificates, download your experience letter, and share with employers.", icon: Award },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-violet-950 to-slate-900" />
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
        {/* Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-violet-500/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 right-1/4 w-64 h-64 bg-purple-400/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-6 pt-28 pb-20 w-full">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white/90 border border-white/20 px-4 py-2 rounded-full text-sm font-medium mb-8">
              <Sparkles className="w-4 h-4 text-violet-300" />
              RedNotice Academy — Trusted by 10,000+ Students
              <ArrowRight className="w-3.5 h-3.5 text-violet-300" />
            </motion.div>

            <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
              className="font-display font-extrabold text-5xl sm:text-6xl lg:text-7xl text-white leading-[1.1] tracking-tight mb-6">
              Launch Your Career<br />
              <span className="bg-gradient-to-r from-violet-300 via-purple-300 to-indigo-300 bg-clip-text text-transparent">
                with Real Experience
              </span>
            </motion.h1>

            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg sm:text-xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed">
              Complete industry-recognized internship programs, build real projects,
              and earn QR-verified certificates — all from one platform.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <button onClick={() => go("internships")}
                className="px-8 py-4 bg-white text-slate-900 rounded-xl font-bold text-base hover:bg-white/90 transition-all shadow-2xl shadow-white/10 flex items-center gap-2 justify-center">
                Browse Internships <ArrowRight className="w-4 h-4" />
              </button>
              <button onClick={() => go("verify")}
                className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white border border-white/20 rounded-xl font-semibold text-base hover:bg-white/20 transition-all flex items-center gap-2 justify-center">
                <QrCode className="w-4 h-4" /> Verify Certificate
              </button>
            </motion.div>

            {/* Stats row */}
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.45 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-6 border-t border-white/10 pt-10">
              {stats.map(({ value, label, icon: Icon }) => (
                <div key={label} className="text-center">
                  <Icon className="w-5 h-5 text-violet-300 mx-auto mb-2" />
                  <div className="text-3xl font-display font-bold text-white mb-1">{value}</div>
                  <div className="text-xs text-white/50 font-medium">{label}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <Badge color="violet">How it works</Badge>
          <h2 className="font-display font-bold text-4xl text-foreground mt-4 mb-4">Three steps to your certificate</h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">From enrollment to verified certificate in as little as 2 months.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {howItWorks.map(({ step, title, desc, icon: Icon }, i) => (
            <motion.div key={step} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.5 }}
              className="relative p-8 bg-card border border-border rounded-2xl group hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
              <div className="flex items-start justify-between mb-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Icon className="w-5.5 h-5.5 text-primary" />
                </div>
                <span className="font-display font-extrabold text-5xl text-border group-hover:text-primary/20 transition-colors">{step}</span>
              </div>
              <h3 className="font-display font-semibold text-lg text-foreground mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              {i < 2 && (
                <div className="hidden md:block absolute top-1/2 -right-5 w-10 h-0.5 bg-border" />
              )}
            </motion.div>
          ))}
        </div>
      </section>

      {/* Featured Internships */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-end justify-between mb-10">
            <div>
              <Badge color="violet">Programs</Badge>
              <h2 className="font-display font-bold text-4xl text-foreground mt-3">Top Internship Programs</h2>
            </div>
            <button onClick={() => go("internships")} className="hidden md:flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
              View all programs <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {featuredLoading ? (
            <div className="flex items-center justify-center py-20"><Spin /></div>
          ) : featuredInternships.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No programs available yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredInternships.map((intern, i) => (
              <motion.div key={intern.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07, duration: 0.5 }}>
                <InternshipCard intern={intern} />
              </motion.div>
            ))}
          </div>
          )}

          <div className="text-center mt-10 md:hidden">
            <button onClick={() => go("internships")} className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity">
              View All Programs
            </button>
          </div>
        </div>
      </section>

      {/* Certificate showcase */}
      <section className="py-24 max-w-7xl mx-auto px-6">
        <div className="rounded-3xl bg-gradient-to-br from-indigo-950 via-violet-950 to-slate-900 p-12 md:p-16 overflow-hidden relative">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.1) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
          <div className="relative grid md:grid-cols-2 gap-12 items-center">
            <div>
              <Badge color="violet">Certificates</Badge>
              <h2 className="font-display font-bold text-4xl text-white mt-4 mb-4">Certificates employers instantly trust</h2>
              <p className="text-white/60 text-lg leading-relaxed mb-8">
                Every certificate comes with a unique QR code. Employers scan it and are taken directly to our verification portal — no doubts, instant trust.
              </p>
              <div className="flex flex-col gap-3 mb-8">
                {["Internship Completion Certificate", "Project Certificate", "Experience Letter", "QR Code Verification"].map((item) => (
                  <div key={item} className="flex items-center gap-3 text-white/80 text-sm">
                    <CheckCircle className="w-4.5 h-4.5 text-emerald-400 flex-shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
              <button onClick={() => go("verify")}
                className="px-6 py-3 bg-white text-slate-900 rounded-xl font-bold text-sm hover:bg-white/90 transition-all flex items-center gap-2">
                <QrCode className="w-4 h-4" /> Verify a Certificate
              </button>
            </div>
            {/* Certificate preview */}
            <div className="relative flex items-center justify-center">
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 max-w-sm w-full shadow-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/30 flex items-center justify-center">
                    <Award className="w-5 h-5 text-violet-300" />
                  </div>
                  <div>
                    <p className="text-white font-display font-bold text-sm">RedNotice Academy</p>
                    <p className="text-white/50 text-xs">Certificate of Completion</p>
                  </div>
                </div>
                <div className="border-t border-white/10 pt-5 mb-5">
                  <p className="text-white/50 text-xs mb-1">This certifies that</p>
                  <p className="text-white font-display font-bold text-xl">Priya Sharma</p>
                  <p className="text-white/60 text-sm mt-1">has successfully completed</p>
                  <p className="text-violet-300 font-semibold text-base mt-1">Full Stack Web Development</p>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/40 text-xs">Issue Date</p>
                    <p className="text-white text-sm font-semibold">Sep 15, 2024</p>
                  </div>
                  <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                    <QrCode className="w-8 h-8 text-white/80" />
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-xs text-white/40 font-mono">RNA-2024-WD-001247</p>
                  <div className="mt-2 flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <p className="text-xs text-emerald-400 font-semibold">Verified Active</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <Badge color="violet">Testimonials</Badge>
            <h2 className="font-display font-bold text-4xl text-foreground mt-4 mb-3">What our students say</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">Thousands of students have launched their careers through RedNotice Academy.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <motion.div key={t.name} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.5 }}
                className="bg-card border border-border rounded-2xl p-7 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
                <StarRow rating={t.rating} />
                <p className="text-foreground text-base mt-4 mb-5 leading-relaxed">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <img src={t.avatar} alt={t.name} className="w-10 h-10 rounded-full object-cover bg-muted" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                  <div className="ml-auto">
                    <Badge color="slate">{t.program}</Badge>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 max-w-7xl mx-auto px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <Badge color="violet">FAQ</Badge>
            <h2 className="font-display font-bold text-4xl text-foreground mt-4 mb-3">Frequently asked questions</h2>
          </div>
          <div className="flex flex-col gap-3">
            {FAQS.map((faq, i) => (
              <div key={i} className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/20 transition-colors">
                <button className="w-full flex items-center justify-between px-6 py-4 text-left" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span className="font-semibold text-foreground text-sm">{faq.q}</span>
                  <ChevronDown className={cn("w-4.5 h-4.5 text-muted-foreground transition-transform duration-200 flex-shrink-0 ml-4", openFaq === i && "rotate-180")} />
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                      <p className="px-6 pb-5 text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-24 max-w-7xl mx-auto px-6">
        <div className="bg-primary rounded-3xl p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 30% 50%, rgba(255,255,255,0.3) 0%, transparent 60%)" }} />
          <div className="relative">
            <h2 className="font-display font-extrabold text-4xl text-white mb-4">Ready to start your internship?</h2>
            <p className="text-primary-foreground/70 text-lg mb-8 max-w-lg mx-auto">Join 10,000+ students who have launched their careers with RedNotice Academy.</p>
            <button onClick={() => go("internships")}
              className="px-8 py-4 bg-white text-primary rounded-xl font-bold text-base hover:opacity-90 transition-opacity shadow-xl inline-flex items-center gap-2">
              Browse All Programs <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

// ── Internships Listing ───────────────────────────────────────────────────────
function InternshipsPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [sortBy, setSortBy] = useState("popular");
  const [listings, setListings] = useState<Internship[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState("");

  useEffect(() => {
    setLoadingList(true);
    setListError("");
    api.internships.getAll({ search: query, category })
      .then((data) => setListings(data || []))
      .catch((err) => setListError(err instanceof ApiError ? err.message : "Couldn't load programs. Please try again."))
      .finally(() => setLoadingList(false));
  }, [query, category]);

  const filtered = listings.filter((i) => {
    const matchQ = !query || i.title.toLowerCase().includes(query.toLowerCase()) || i.skills.some((s) => s.toLowerCase().includes(query.toLowerCase()));
    const matchC = category === "All" || i.category.toLowerCase().includes(category.toLowerCase());
    return matchQ && matchC;
  }).sort((a, b) => sortBy === "price-low" ? a.price - b.price : sortBy === "price-high" ? b.price - a.price : b.enrolled - a.enrolled);

  return (
    <div className="pt-24 pb-24 max-w-7xl mx-auto px-6">
      <div className="mb-10">
        <h1 className="font-display font-extrabold text-4xl text-foreground mb-2">Internship Programs</h1>
        <p className="text-muted-foreground text-lg">52+ programs across 6 domains. All with QR-verified certificates.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-10">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search programs, skills..."
            className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all" />
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1 flex-shrink-0">
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => setCategory(c)}
              className={cn("px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all border",
                category === c ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20" : "bg-card border-border text-muted-foreground hover:border-primary/30 hover:text-foreground")}>
              {c}
            </button>
          ))}
        </div>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
          className="px-4 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all">
          <option value="popular">Most Popular</option>
          <option value="price-low">Price: Low to High</option>
          <option value="price-high">Price: High to Low</option>
        </select>
      </div>

      {loadingList ? (
        <div className="text-center py-24">
          <Spin />
        </div>
      ) : listError ? (
        <div className="text-center py-24">
          <AlertCircle className="w-12 h-12 text-red-500/60 mx-auto mb-4" />
          <p className="text-lg font-semibold text-foreground mb-2">Couldn't load programs</p>
          <p className="text-muted-foreground text-sm">{listError}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24">
          <Search className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-lg font-semibold text-foreground mb-2">No programs found</p>
          <p className="text-muted-foreground text-sm">Try adjusting your search or filter.</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-6">{filtered.length} programs found</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((intern, i) => (
              <motion.div key={intern.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, duration: 0.4 }}>
                <InternshipCard intern={intern} />
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Internship Detail ─────────────────────────────────────────────────────────
function InternshipDetailPage() {
  const { selectedId, go, user } = useApp();
  const [activeTab, setActiveTab] = useState("overview");
  const [enrolling, setEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState("");
  const [intern, setIntern] = useState<Internship | null>(null);
  const [loadingIntern, setLoadingIntern] = useState(true);
  const [internError, setInternError] = useState("");

  useEffect(() => {
    if (!selectedId) {
      setLoadingIntern(false);
      setInternError("No internship selected.");
      return;
    }
    setLoadingIntern(true);
    setInternError("");
    api.internships.getById(selectedId)
      .then((data) => { if (data) setIntern(data); })
      .catch((err) => setInternError(err instanceof ApiError ? err.message : "Couldn't load this internship."))
      .finally(() => setLoadingIntern(false));
  }, [selectedId]);

  const handleEnroll = async () => {
    if (!user) { go("login"); return; }
    setEnrollError("");
    setEnrolling(true);
    try {
      const order = await api.enrollment.enroll(intern.id);
      if (order.devCompleted || order.enrollmentId) {
        go("student");
        return;
      }

      const loaded = await loadRazorpayScript();
      if (!loaded || !window.Razorpay) {
        throw new ApiError("Payment checkout could not be loaded. Please try again.", 0);
      }

      await new Promise<void>((resolve, reject) => {
        const checkout = new window.Razorpay!({
          key: order.key,
          amount: order.amount,
          currency: order.currency || "INR",
          name: "InternCert",
          description: intern.title,
          order_id: order.orderId,
          prefill: {
            name: user.name,
            email: user.email,
          },
          handler: async (response: any) => {
            try {
              await api.enrollment.verifyPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });
              resolve();
            } catch (err) {
              reject(err);
            }
          },
          modal: {
            ondismiss: () => reject(new ApiError("Payment was cancelled.", 0)),
          },
          theme: { color: "#5b5cf6" },
        });
        checkout.open();
      });
      go("student");
    } catch (err) {
      setEnrollError(err instanceof ApiError ? err.message : "Couldn't start enrollment. Please try again.");
    } finally {
      setEnrolling(false);
    }
  };

  const curriculum = [
    { week: "Week 1-2", topic: "Fundamentals & Setup", items: ["Environment Setup", "Core Concepts", "Tools Introduction"] },
    { week: "Week 3-6", topic: "Core Development", items: ["Module 1", "Module 2", "Hands-on Projects"] },
    { week: "Week 7-10", topic: "Advanced Topics", items: ["Advanced Patterns", "Performance", "Testing"] },
    { week: "Week 11-12", topic: "Capstone Project", items: ["Final Project Build", "Code Review", "Deployment"] },
  ];

  if (loadingIntern) {
    return (
      <div className="pt-32 pb-24 flex justify-center">
        <Spin />
      </div>
    );
  }

  if (!intern || internError) {
    return (
      <div className="pt-32 pb-24 max-w-2xl mx-auto px-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500/60 mx-auto mb-4" />
        <h1 className="font-display font-bold text-2xl text-foreground mb-2">Internship unavailable</h1>
        <p className="text-muted-foreground mb-6">{internError || "Couldn't load this internship."}</p>
        <button onClick={() => go("internships")} className="px-5 py-3 rounded-xl bg-primary text-primary-foreground font-semibold">
          View Programs
        </button>
      </div>
    );
  }

  return (
    <div className="pt-20">
      {/* Banner */}
      <div className="relative h-72 md:h-96 overflow-hidden bg-muted">
        <img src={intern.image} alt={intern.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-2 mb-3">
              <Badge color="violet">{intern.category}</Badge>
              {intern.badge && <Badge color="amber">{intern.badge}</Badge>}
            </div>
            <h1 className="font-display font-extrabold text-3xl md:text-5xl text-white mb-3">{intern.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-white/70 text-sm">
              <span className="flex items-center gap-1.5"><StarRow rating={intern.rating} /><strong className="text-white">{intern.rating}</strong> ({intern.reviews} reviews)</span>
              <span className="flex items-center gap-1.5"><Users className="w-4 h-4" />{intern.enrolled.toLocaleString()} enrolled</span>
              <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{intern.duration}</span>
              <span className="flex items-center gap-1.5"><Target className="w-4 h-4" />{intern.level}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Main content */}
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="flex gap-1 border-b border-border mb-8">
              {["overview", "curriculum", "reviews"].map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={cn("px-5 py-3 text-sm font-semibold capitalize transition-all border-b-2 -mb-px",
                    activeTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
                  {tab}
                </button>
              ))}
            </div>

            {activeTab === "overview" && (
              <div>
                <h2 className="font-display font-bold text-2xl text-foreground mb-4">About this program</h2>
                <p className="text-muted-foreground leading-relaxed mb-8">{intern.description}</p>
                <h3 className="font-semibold text-foreground mb-4">Skills you&apos;ll learn</h3>
                <div className="flex flex-wrap gap-2 mb-8">
                  {intern.skills.map((s) => (
                    <span key={s} className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-sm font-medium">{s}</span>
                  ))}
                </div>
                <h3 className="font-semibold text-foreground mb-4">Program includes</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: Layers, label: `${intern.modules || 12} Learning Modules` },
                    { icon: Code2, label: `${intern.projects || 4} Real Projects` },
                    { icon: Award, label: "3 Certificates" },
                    { icon: QrCode, label: "QR Verification" },
                    { icon: Clock, label: "Self-paced Learning" },
                    { icon: HelpCircle, label: "24/7 Support" },
                  ].map(({ icon: Icon, label }) => (
                    <div key={label} className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl">
                      <Icon className="w-4.5 h-4.5 text-primary flex-shrink-0" />
                      <span className="text-sm text-foreground">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "curriculum" && (
              <div>
                <h2 className="font-display font-bold text-2xl text-foreground mb-6">Program Curriculum</h2>
                <div className="flex flex-col gap-4">
                  {curriculum.map((c, i) => (
                    <div key={i} className="border border-border rounded-xl overflow-hidden">
                      <div className="flex items-center gap-3 p-4 bg-muted/50">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{i + 1}</div>
                        <div>
                          <p className="font-semibold text-foreground text-sm">{c.topic}</p>
                          <p className="text-xs text-muted-foreground">{c.week}</p>
                        </div>
                      </div>
                      <div className="p-4">
                        {c.items.map((item) => (
                          <div key={item} className="flex items-center gap-2.5 py-1.5 text-sm text-muted-foreground">
                            <PlayCircle className="w-4 h-4 text-primary/60 flex-shrink-0" /> {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "reviews" && (
              <div>
                <h2 className="font-display font-bold text-2xl text-foreground mb-6">Student Reviews</h2>
                <div className="flex items-center gap-6 p-6 bg-card border border-border rounded-2xl mb-6">
                  <div className="text-center">
                    <p className="font-display font-extrabold text-6xl text-foreground">{intern.rating}</p>
                    <StarRow rating={intern.rating} />
                    <p className="text-xs text-muted-foreground mt-1">{intern.reviews} reviews</p>
                  </div>
                  <div className="flex-1 flex flex-col gap-2">
                    {[5, 4, 3, 2, 1].map((n) => (
                      <div key={n} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-3">{n}</span>
                        <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                          <div className="h-full bg-amber-400 rounded-full" style={{ width: `${n === 5 ? 78 : n === 4 ? 15 : n === 3 ? 5 : 2}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {TESTIMONIALS.slice(0, 2).map((t) => (
                  <div key={t.name} className="border border-border rounded-xl p-5 mb-4">
                    <div className="flex items-center gap-3 mb-3">
                      <img src={t.avatar} alt={t.name} className="w-9 h-9 rounded-full object-cover bg-muted" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">{t.name}</p>
                        <StarRow rating={t.rating} />
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{t.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sticky enrollment card */}
          <div>
            <div className="sticky top-24 bg-card border border-border rounded-2xl overflow-hidden shadow-xl shadow-primary/5">
              <div className="p-6">
                <div className="mb-5">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="font-display font-extrabold text-3xl text-foreground">₹{intern.price.toLocaleString()}</span>
                    {intern.originalPrice && (
                      <span className="text-base text-muted-foreground line-through">₹{intern.originalPrice.toLocaleString()}</span>
                    )}
                  </div>
                  {intern.originalPrice && (
                    <Badge color="green">{Math.round((1 - intern.price / intern.originalPrice) * 100)}% off</Badge>
                  )}
                </div>
                {enrollError && (
                  <div className="flex items-center gap-2 p-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-xs mb-3">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {enrollError}
                  </div>
                )}
                <button onClick={handleEnroll} disabled={enrolling}
                  className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-bold text-base hover:opacity-90 transition-opacity shadow-lg shadow-primary/30 flex items-center justify-center gap-2 mb-3">
                  {enrolling ? <Spin /> : <><Zap className="w-4 h-4" /> Enroll Now</>}
                </button>
                <p className="text-center text-xs text-muted-foreground mb-5">7-day money-back guarantee</p>
                <div className="flex flex-col gap-3">
                  {[
                    { icon: Clock, label: `Duration: ${intern.duration}` },
                    { icon: Target, label: `Level: ${intern.level}` },
                    { icon: Layers, label: `${intern.modules || 12} modules` },
                    { icon: Code2, label: `${intern.projects || 4} projects` },
                    { icon: Award, label: "3 certificates" },
                    { icon: Globe, label: "Self-paced, online" },
                  ].map(({ icon: Icon, label }) => (
                    <div key={label} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                      <Icon className="w-4 h-4 text-primary/70" /> {label}
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t border-border p-4 bg-muted/30">
                <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" /> Secure payment via Razorpay
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Auth Pages ────────────────────────────────────────────────────────────────
function LoginPage() {
  const { go, login } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError("Please fill in all fields."); return; }
    if (!/^\S+@\S+\.\S+$/.test(email)) { setError("Please enter a valid email address."); return; }
    setLoading(true);
    try {
      const { user, token } = await api.auth.login(email, password);
      login(user, token);
      go(user.role === "admin" ? "admin" : "student");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-16 flex">
      {/* Left branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-950 via-violet-950 to-slate-900 items-center justify-center p-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 50% 50%, white 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="relative text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center mx-auto mb-6">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h2 className="font-display font-extrabold text-4xl text-white mb-4">Welcome back</h2>
          <p className="text-white/60 text-lg max-w-sm">Continue your journey toward a verified internship certificate.</p>
          <div className="mt-10 grid grid-cols-2 gap-4 text-center">
            {[{ v: "10K+", l: "Students" }, { v: "52+", l: "Programs" }, { v: "8K+", l: "Certs Issued" }, { v: "4.8★", l: "Avg Rating" }].map(({ v, l }) => (
              <div key={l} className="bg-white/10 rounded-xl p-4">
                <p className="font-display font-bold text-2xl text-white">{v}</p>
                <p className="text-white/50 text-xs mt-0.5">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <h1 className="font-display font-bold text-3xl text-foreground mb-2">Sign in</h1>
          <p className="text-muted-foreground mb-8">
            Don&apos;t have an account?{" "}
            <button onClick={() => go("register")} className="text-primary font-semibold hover:underline">Create one</button>
          </p>

          {error && (
            <div className="flex items-center gap-2.5 p-3.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm mb-5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com" className="w-full pl-10 pr-4 py-3 bg-input-background border border-border rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all" />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password" className="w-full pl-10 pr-10 py-3 bg-input-background border border-border rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all" />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="flex justify-end">
              <button type="button" className="text-xs text-primary hover:underline">Forgot password?</button>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-bold text-base hover:opacity-90 transition-opacity shadow-lg shadow-primary/20 flex items-center justify-center gap-2 mt-1">
              {loading ? <Spin /> : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function RegisterPage() {
  const { go } = useApp();
  const [registered, setRegistered] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [enrollmentNo, setEnrollmentNo] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const validateForm = () => {
    if (!name.trim()) return "Please enter your full name.";
    if (!/^[^\s@]+@[^\s@]+\.(edu|ac\.in)$/i.test(email)) return "Please enter a valid college email ending in .edu or .ac.in.";
    if (!enrollmentNo.trim()) return "Please enter your enrollment number.";
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password)) return "Password must be at least 8 characters and include uppercase, lowercase, and a number.";
    return "";
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const validationError = validateForm();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    try {
      await api.auth.register({ name, email, password, enrollmentNo });
      setRegistered(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-16 flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="w-7 h-7 text-primary" />
          </div>
          <h1 className="font-display font-bold text-3xl text-foreground mb-2">{registered ? "Check your email" : "Create your account"}</h1>
          <p className="text-muted-foreground">
            {!registered ? (
              <>Already have an account?{" "}<button onClick={() => go("login")} className="text-primary font-semibold hover:underline">Sign in</button></>
            ) : (
              <>We sent a verification link to <strong className="text-foreground">{email}</strong></>
            )}
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2.5 p-3.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm mb-5">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!registered ? (
          <form onSubmit={handleRegister} className="flex flex-col gap-4">
            {[
              { label: "Full Name", icon: UserCheck, value: name, setter: setName, type: "text", placeholder: "Priya Sharma" },
              { label: "College Email", icon: Mail, value: email, setter: setEmail, type: "email", placeholder: "you@college.edu" },
              { label: "Enrollment No.", icon: Hash, value: enrollmentNo, setter: setEnrollmentNo, type: "text", placeholder: "ENR2026001" },
              { label: "Password", icon: Lock, value: password, setter: setPassword, type: "password", placeholder: "Min. 8 characters" },
            ].map(({ label, icon: Icon, value, setter, type, placeholder }) => (
              <div key={label}>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">{label}</label>
                <div className="relative">
                  <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input type={type} value={value} onChange={(e) => setter(e.target.value)} placeholder={placeholder}
                    className="w-full pl-10 pr-4 py-3 bg-input-background border border-border rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all" />
                </div>
              </div>
            ))}
            <button type="submit" disabled={loading}
              className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-bold text-base hover:opacity-90 transition-opacity shadow-lg shadow-primary/20 flex items-center justify-center gap-2 mt-1">
              {loading ? <Spin /> : "Create Account"}
            </button>
          </form>
        ) : (
          <div className="bg-card border border-border rounded-2xl p-6 text-center">
            <Mail className="w-10 h-10 text-primary mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-5">Open your inbox and click the link, then sign in.</p>
            <button type="button" onClick={() => go("login")}
              className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-bold text-base hover:opacity-90 transition-opacity shadow-lg shadow-primary/20">
              Go to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Student Dashboard ─────────────────────────────────────────────────────────
function StudentDashboard() {
  const { user, go, theme, toggleTheme, logout } = useApp();
  const [tab, setTab] = useState<StudentTab>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");

  useEffect(() => {
    if (!user) return;
    setDashboardLoading(true);
    setDashboardError("");
    Promise.all([
      api.enrollment.getMyEnrollments(),
      api.certificates.getMyCertificates(),
      api.payments.getMyPayments(),
    ])
      .then(([enrollmentData, certificateData, paymentData]) => {
        setEnrollments(enrollmentData || []);
        setCertificates(certificateData || []);
        setPayments(paymentData || []);
      })
      .catch((err) => {
        setDashboardError(err instanceof ApiError ? err.message : "Couldn't load your dashboard.");
        setEnrollments([]);
        setCertificates([]);
        setPayments([]);
      })
      .finally(() => setDashboardLoading(false));
  }, [user]);

  useEffect(() => {
    if (!user) go("login");
  }, [user]);

  if (!user) return null;

  const navItems: { label: string; tab: StudentTab; icon: React.ElementType }[] = [
    { label: "Overview", tab: "overview", icon: Home },
    { label: "My Internships", tab: "internships", icon: Briefcase },
    { label: "Assignments", tab: "assignments", icon: FileText },
    { label: "Certificates", tab: "certs", icon: Award },
    { label: "Payments", tab: "payments", icon: CreditCard },
    { label: "Profile", tab: "profile", icon: Settings },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full py-6">
      <div className="px-5 mb-8">
        <button onClick={() => go("home")} className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <span className="font-display font-bold text-lg tracking-tight text-foreground">intern<span className="text-primary">me</span></span>
        </button>
      </div>
      <div className="px-3 flex-1">
        {navItems.map(({ label, tab: t, icon: Icon }) => (
          <button key={t} onClick={() => { setTab(t); setSidebarOpen(false); }}
            className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 text-sm font-medium transition-all",
              tab === t ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30" : "text-muted-foreground hover:text-foreground hover:bg-muted")}>
            <Icon className="w-4.5 h-4.5 flex-shrink-0" /> {label}
          </button>
        ))}
      </div>
      <div className="px-3 border-t border-border pt-4">
        <button onClick={toggleTheme} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all mb-1">
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          {theme === "dark" ? "Light Mode" : "Dark Mode"}
        </button>
        <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex flex-col w-60 border-r border-border bg-sidebar flex-shrink-0 fixed left-0 top-0 bottom-0 overflow-y-auto">
        {sidebarContent}
      </aside>

      {/* Sidebar mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-30" onClick={() => setSidebarOpen(false)} />
            <motion.aside initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} transition={{ type: "spring", stiffness: 400, damping: 40 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 w-64 bg-sidebar border-r border-border z-40 overflow-y-auto">
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 lg:ml-60 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-background/90 backdrop-blur-xl border-b border-border h-16 flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-2 rounded-lg hover:bg-muted" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="font-display font-semibold text-foreground capitalize text-lg">
              {navItems.find((n) => n.tab === tab)?.label}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg hover:bg-muted text-muted-foreground relative">
              <Bell className="w-4.5 h-4.5" />
              <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg">
              <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
                {user.name[0]}
              </div>
              <span className="text-sm font-medium text-foreground hidden sm:block">{user.name.split(" ")[0]}</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6">
          {dashboardError && (
            <div className="mb-5 flex items-center gap-2.5 p-3.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {dashboardError}
            </div>
          )}
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              {tab === "overview" && <StudentOverview user={user} go={go} setTab={setTab} enrollments={enrollments} certificates={certificates} loading={dashboardLoading} />}
              {tab === "internships" && <StudentInternships go={go} enrollments={enrollments} loading={dashboardLoading} />}
              {tab === "assignments" && <StudentAssignments enrollments={enrollments} />}
              {tab === "certs" && <StudentCerts certificates={certificates} loading={dashboardLoading} />}
              {tab === "payments" && <StudentPayments payments={payments} />}
              {tab === "profile" && <StudentProfile user={user} />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

function StudentOverview({
  user,
  go,
  setTab,
  enrollments,
  certificates,
  loading,
}: {
  user: User;
  go: (p: Page) => void;
  setTab: (t: StudentTab) => void;
  enrollments: any[];
  certificates: any[];
  loading: boolean;
}) {
  const activeEnrollments = enrollments.filter((enrollment) => enrollment.status === "active");
  const completedEnrollments = enrollments.filter((enrollment) => enrollment.status === "completed");
  const currentEnrollment = activeEnrollments[0] || enrollments[0];
  const progress = currentEnrollment ? enrollmentProgress(currentEnrollment) : { completed: 0, total: 0, percentage: 0 };
  const cards = [
    { label: "Enrolled Programs", value: String(enrollments.length), icon: Briefcase, color: "text-violet-500", bg: "bg-violet-500/10" },
    { label: "Completed", value: String(completedEnrollments.length), icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Certificates", value: String(certificates.length), icon: Award, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "Assignments Done", value: String(enrollments.reduce((sum, enrollment) => sum + enrollmentProgress(enrollment).completed, 0)), icon: FileText, color: "text-blue-500", bg: "bg-blue-500/10" },
  ];

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Spin /></div>;
  }

  return (
    <div>
      {/* Welcome */}
      <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-7 mb-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-white/70 text-sm mb-1">Welcome back 👋</p>
            <h2 className="font-display font-extrabold text-3xl text-white mb-2">{user.name}</h2>
            <p className="text-white/60 text-sm">
              {currentEnrollment
                ? `You're ${progress.percentage}% through ${enrollmentTitle(currentEnrollment)}.`
                : "Browse programs to start your first internship."}
            </p>
            <div className="mt-4 flex gap-3">
              <button onClick={() => currentEnrollment ? setTab("internships") : go("internships")}
                className="px-4 py-2 bg-white text-violet-700 rounded-lg text-sm font-bold hover:bg-white/90 transition-colors flex items-center gap-1.5">
                {currentEnrollment ? "Continue Learning" : "Browse Programs"} <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          {currentEnrollment && (
            <div className="relative flex-shrink-0">
              <ProgressRing pct={progress.percentage} size={80} stroke={6} />
              <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm">{progress.percentage}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-card border border-border rounded-2xl p-5 hover:border-primary/20 hover:shadow-md transition-all">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", bg)}>
              <Icon className={cn("w-5 h-5", color)} />
            </div>
            <p className="font-display font-bold text-2xl text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Current internship */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-foreground">Current Internship</h3>
          <button onClick={() => setTab("internships")} className="text-xs text-primary hover:underline flex items-center gap-1">View all <ChevronRight className="w-3.5 h-3.5" /></button>
        </div>
        {currentEnrollment ? (
          <>
            <div className="flex items-start gap-4">
              <div className="w-16 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-xl flex-shrink-0">
                {enrollmentInternship(currentEnrollment)?.icon || <Briefcase className="w-5 h-5 text-primary" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm mb-1 truncate">{enrollmentTitle(currentEnrollment)}</p>
                <div className="flex items-center gap-2 mb-3">
                  <Badge color={statusColor(currentEnrollment.status)}>{currentEnrollment.status || "active"}</Badge>
                  <span className="text-xs text-muted-foreground">{progress.percentage}% complete</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${progress.percentage}%` }} transition={{ duration: 1, delay: 0.3 }} className="h-full bg-primary rounded-full" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-5">
              {[
                { label: "Tasks", value: `${progress.completed}/${progress.total}`, status: "amber" as const },
                { label: "Duration", value: `${currentEnrollment.duration_months || 0} mo`, status: "blue" as const },
                { label: "Certificate", value: currentEnrollment.status === "completed" ? "Eligible" : "Locked", status: currentEnrollment.status === "completed" ? "green" as const : "slate" as const },
              ].map(({ label, value, status }) => (
                <div key={label} className="bg-muted/50 rounded-xl p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">{label}</p>
                  <Badge color={status}>{value}</Badge>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-10 text-muted-foreground">
            <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No active internship yet.</p>
          </div>
        )}
      </div>

      {/* Notifications */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="font-semibold text-foreground mb-4">Recent Notifications</h3>
        <div className="flex items-start gap-3 py-3">
          <Bell className="w-4.5 h-4.5 flex-shrink-0 mt-0.5 text-violet-500" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground">
              {currentEnrollment
                ? `Next task: ${Math.min(Number(currentEnrollment.current_task || 1), Number(currentEnrollment.total_tasks || 1))} of ${currentEnrollment.total_tasks}.`
                : "Enroll in a program to receive task updates here."}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Updated from your enrollment data</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StudentInternships({ go, enrollments, loading }: { go: (p: Page, d?: { id?: string }) => void; enrollments: any[]; loading: boolean }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display font-bold text-2xl text-foreground">My Internships</h2>
        <button onClick={() => go("internships")} className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Browse More
        </button>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-20"><Spin /></div>
      ) : enrollments.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="mb-4">No internships enrolled yet.</p>
          <button onClick={() => go("internships")} className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold">
            Browse Programs
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {enrollments.map((enrollment) => {
            const progress = enrollmentProgress(enrollment);
            return (
              <div key={enrollmentId(enrollment)} className="bg-card border border-border rounded-2xl p-6">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-20 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-2xl flex-shrink-0">
                    {enrollmentInternship(enrollment)?.icon || <Briefcase className="w-6 h-6 text-primary" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-foreground">{enrollmentTitle(enrollment)}</h3>
                      <Badge color={statusColor(enrollment.status)}>{enrollment.status || "active"}</Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-3">
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {enrollment.duration_months} months</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Started {formatDate(enrollment.start_date)}</span>
                      <span className="flex items-center gap-1"><Hash className="w-3.5 h-3.5" /> {enrollment.internship_code}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${progress.percentage}%` }} transition={{ duration: 1 }} className="h-full bg-primary rounded-full" />
                      </div>
                      <span className="text-xs font-semibold text-foreground">{progress.percentage}%</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "Tasks", value: `${progress.completed}/${progress.total}`, pct: progress.percentage, color: "bg-violet-500" },
                    { label: "Current Task", value: `${enrollment.current_task || 1}`, pct: Math.min(100, ((Number(enrollment.current_task || 1)) / Math.max(1, Number(enrollment.total_tasks || 1))) * 100), color: "bg-amber-500" },
                    { label: "Amount Paid", value: `₹${Number(enrollment.amount_paid || 0).toLocaleString()}`, pct: 100, color: "bg-blue-500" },
                  ].map(({ label, value, pct, color }) => (
                    <div key={label} className="bg-muted/50 rounded-xl p-4">
                      <p className="text-xs text-muted-foreground mb-1">{label}</p>
                      <p className="font-bold text-foreground text-lg">{value}</p>
                      <div className="mt-2 h-1 bg-border rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full", color)} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StudentAssignments({ enrollments }: { enrollments: any[] }) {
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState("");
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!enrollments.length) {
      setSelectedEnrollmentId("");
      setTasks([]);
      return;
    }
    const stillExists = enrollments.some((enrollment) => enrollmentId(enrollment) === selectedEnrollmentId);
    if (!selectedEnrollmentId || !stillExists) {
      setSelectedEnrollmentId(enrollmentId(enrollments[0]));
    }
  }, [enrollments, selectedEnrollmentId]);

  useEffect(() => {
    if (!selectedEnrollmentId) return;
    setLoading(true);
    setError("");
    api.tasks.getAll(selectedEnrollmentId)
      .then((data) => setTasks(data || []))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load assignments."))
      .finally(() => setLoading(false));
  }, [selectedEnrollmentId]);

  const statusConfig: Record<string, { color: "green" | "amber" | "red" | "slate" | "blue"; label: string }> = {
    completed: { color: "green", label: "Completed" },
    approved: { color: "green", label: "Approved" },
    current: { color: "amber", label: "Current" },
    pending: { color: "amber", label: "Pending Review" },
    rejected: { color: "red", label: "Rejected" },
    locked: { color: "slate", label: "Locked" },
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h2 className="font-display font-bold text-2xl text-foreground">Assignments</h2>
        {enrollments.length > 1 && (
          <select value={selectedEnrollmentId} onChange={(e) => setSelectedEnrollmentId(e.target.value)}
            className="px-4 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all">
            {enrollments.map((enrollment) => (
              <option key={enrollmentId(enrollment)} value={enrollmentId(enrollment)}>{enrollmentTitle(enrollment)}</option>
            ))}
          </select>
        )}
      </div>
      {enrollments.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No assignments yet. Enroll in a program to unlock tasks.</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-20"><Spin /></div>
      ) : error ? (
        <div className="text-center py-20 text-red-500">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-60" />
          <p>{error}</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No tasks found for this enrollment.</p>
        </div>
      ) : (
      <div className="flex flex-col gap-4">
        {tasks.map((task) => (
          <div key={task.task_number} className="bg-card border border-border rounded-2xl p-5 hover:border-primary/20 transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-1">{task.title || `Task ${task.task_number}`}</h3>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>Task {task.task_number}</span>
                  {task.deadline_days && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Deadline: {task.deadline_days} days</span>}
                </div>
                {task.description && <p className="text-sm text-muted-foreground mt-3">{task.description}</p>}
                {task.submission?.linkedin_url && (
                  <a href={task.submission.linkedin_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline mt-2 inline-flex items-center gap-1">
                    View submission <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge color={(statusConfig[task.status] || { color: "blue" }).color}>{(statusConfig[task.status] || { label: task.status || "Open" }).label}</Badge>
              </div>
            </div>
            {(task.status === "current" || task.status === "rejected") && (
              <button className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5">
                <ArrowUpRight className="w-3.5 h-3.5" /> Submit Assignment
              </button>
            )}
          </div>
        ))}
      </div>
      )}
    </div>
  );
}

function StudentCerts({ certificates, loading }: { certificates: any[]; loading: boolean }) {
  return (
    <div>
      <h2 className="font-display font-bold text-2xl text-foreground mb-6">My Certificates</h2>
      {loading ? (
        <div className="flex items-center justify-center py-20"><Spin /></div>
      ) : certificates.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Award className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No certificates issued yet.</p>
        </div>
      ) : (
      <div className="flex flex-col gap-4">
        {certificates.map((certificate) => (
          <div key={certificate._id || certificate.cert_id} className="bg-card border border-border rounded-2xl p-6 hover:border-primary/20 transition-colors flex items-center gap-5">
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0", certificate.is_revoked ? "bg-muted" : "bg-amber-500/10")}>
              <Award className={cn("w-7 h-7", certificate.is_revoked ? "text-muted-foreground" : "text-amber-500")} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate">{certificate.internship_name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Completion Certificate</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge color={certificate.is_revoked ? "red" : "green"}>{certificate.is_revoked ? "Revoked" : "Issued"}</Badge>
                <span className="text-xs text-muted-foreground">{formatDate(certificate.created_at)}</span>
              </div>
              <p className="text-xs font-mono text-muted-foreground/60 mt-1">{certificate.cert_id}</p>
            </div>
            {!certificate.is_revoked && (
              <div className="flex gap-2">
                <a href={certificate.pdf_url} target="_blank" rel="noreferrer" className="p-2.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors" title="Download">
                  <Download className="w-4 h-4" />
                </a>
                <a href={certificate.qr_code_url} target="_blank" rel="noreferrer" className="p-2.5 rounded-xl bg-muted text-muted-foreground hover:bg-muted/80 transition-colors" title="QR Code">
                  <QrCode className="w-4 h-4" />
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
      )}
    </div>
  );
}

function StudentPayments({ payments }: { payments: any[] }) {
  return (
    <div>
      <h2 className="font-display font-bold text-2xl text-foreground mb-6">Payment History</h2>
      {payments.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No payments yet.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {["Transaction ID", "Program", "Amount", "Method", "Date", "Status"].map((h) => (
                  <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p._id || p.razorpay_order_id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-4 text-xs font-mono text-muted-foreground">{p.razorpay_payment_id || p.razorpay_order_id}</td>
                  <td className="px-5 py-4 text-sm text-foreground">{p.enrollment_id?.internship_id?.category_name || "Internship"}</td>
                  <td className="px-5 py-4 text-sm font-semibold text-foreground">₹{p.amount.toLocaleString()}</td>
                  <td className="px-5 py-4 text-sm text-muted-foreground">Razorpay</td>
                  <td className="px-5 py-4 text-sm text-muted-foreground">{formatDate(p.paid_at || p.created_at)}</td>
                  <td className="px-5 py-4"><Badge color={statusColor(p.status)}>{p.status || "created"}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StudentProfile({ user }: { user: User }) {
  return (
    <div className="max-w-2xl">
      <h2 className="font-display font-bold text-2xl text-foreground mb-6">My Profile</h2>
      <div className="bg-card border border-border rounded-2xl p-6 mb-4">
        <div className="flex items-center gap-5 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-primary text-white flex items-center justify-center text-2xl font-bold">{user.name[0]}</div>
          <div>
            <h3 className="font-bold text-xl text-foreground">{user.name}</h3>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <Badge color="violet" >Student</Badge>
          </div>
        </div>
        <div className="h-px bg-border mb-5" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: "Full Name", value: user.name },
            { label: "Email Address", value: user.email },
            { label: "Enrollment No.", value: user.enrollment_no || "Not provided" },
            { label: "College", value: user.college_name || "Not provided" },
            { label: "Course", value: user.course || "Not provided" },
          ].map(({ label, value }) => (
            <div key={label}>
              <label className="text-xs text-muted-foreground font-medium block mb-1.5">{label}</label>
              <input readOnly value={value} className="w-full px-3.5 py-2.5 bg-input-background border border-border rounded-xl text-sm text-foreground" />
            </div>
          ))}
        </div>
        <button className="mt-5 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5">
          <Edit3 className="w-3.5 h-3.5" /> Update Profile
        </button>
      </div>
    </div>
  );
}

function Plus({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
}

// ── Admin Dashboard ───────────────────────────────────────────────────────────
function AdminDashboard() {
  const { user, go, theme, toggleTheme, logout } = useApp();
  const [tab, setTab] = useState<AdminTab>("overview");
  const [stats, setStats] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (user?.role !== "admin") return;
    api.admin.getStats().then(setStats).catch(() => setStats(null));
  }, [user]);

  useEffect(() => {
    if (!user) go("login");
    else if (user.role !== "admin") go("student"); // block students from the admin dashboard
  }, [user]);

  if (!user || user.role !== "admin") return null;

  const navItems: { label: string; tab: AdminTab; icon: React.ElementType }[] = [
    { label: "Overview", tab: "overview", icon: Home },
    { label: "Students", tab: "students", icon: Users },
    { label: "Programs", tab: "programs", icon: Briefcase },
    { label: "Certificates", tab: "certs", icon: Award },
    { label: "Payments", tab: "payments", icon: CreditCard },
  ];

  const sidebar = (
    <div className="flex flex-col h-full py-6">
      <div className="px-5 mb-8">
        <button onClick={() => go("home")} className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <span className="font-display font-bold text-lg text-foreground">intern<span className="text-primary">me</span></span>
        </button>
        <div className="mt-2 px-1"><Badge color="red">Admin</Badge></div>
      </div>
      <div className="px-3 flex-1">
        {navItems.map(({ label, tab: t, icon: Icon }) => (
          <button key={t} onClick={() => { setTab(t); setSidebarOpen(false); }}
            className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 text-sm font-medium transition-all",
              tab === t ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted")}>
            <Icon className="w-4.5 h-4.5" /> {label}
          </button>
        ))}
      </div>
      <div className="px-3 border-t border-border pt-4">
        <button onClick={toggleTheme} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition-all mb-1">
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          {theme === "dark" ? "Light Mode" : "Dark Mode"}
        </button>
        <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden lg:flex flex-col w-60 border-r border-border bg-sidebar flex-shrink-0 fixed left-0 top-0 bottom-0">
        {sidebar}
      </aside>
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/40 z-30" onClick={() => setSidebarOpen(false)} />
            <motion.aside initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} transition={{ type: "spring", stiffness: 400, damping: 40 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 w-64 bg-sidebar border-r border-border z-40">
              {sidebar}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 lg:ml-60 flex flex-col">
        <header className="sticky top-0 z-20 bg-background/90 backdrop-blur-xl border-b border-border h-16 flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-2 rounded-lg hover:bg-muted" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="font-display font-semibold text-foreground text-lg capitalize">
              {navItems.find((n) => n.tab === tab)?.label}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg hover:bg-muted text-muted-foreground"><Bell className="w-4.5 h-4.5" /></button>
            <div className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center text-sm font-bold">A</div>
          </div>
        </header>

        <main className="flex-1 p-6">
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              {tab === "overview" && <AdminOverview stats={stats} />}
              {tab === "students" && <AdminStudents />}
              {tab === "programs" && <AdminPrograms />}
              {tab === "certs" && <AdminCerts />}
              {tab === "payments" && <AdminPmts />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

function AdminOverview({ stats }: { stats: any }) {
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([api.admin.getPayments(), api.admin.getEnrollments()])
      .then(([paymentData, enrollmentData]) => {
        const rows = new Map<string, { m: string; revenue: number; students: number }>();
        const ensureRow = (value: string | Date) => {
          const date = new Date(value);
          if (Number.isNaN(date.getTime())) return null;
          const key = `${date.getFullYear()}-${date.getMonth()}`;
          if (!rows.has(key)) {
            rows.set(key, {
              m: date.toLocaleDateString("en-IN", { month: "short" }),
              revenue: 0,
              students: 0,
            });
          }
          return rows.get(key)!;
        };

        (paymentData.payments || []).forEach((payment: any) => {
          const row = ensureRow(payment.paid_at || payment.created_at);
          if (row && payment.status === "paid") row.revenue += Number(payment.amount || 0);
        });
        (enrollmentData.enrollments || []).forEach((enrollment: any) => {
          const row = ensureRow(enrollment.created_at);
          if (row) row.students += 1;
        });

        setChartData(Array.from(rows.values()).slice(-7));
      })
      .catch(() => setChartData([]));
  }, []);

  const cards = stats ? [
    { label: "Total Students", value: stats.totalStudents.toLocaleString(), icon: Users, trend: "Live", color: "text-violet-500", bg: "bg-violet-500/10" },
    { label: "Total Programs", value: stats.totalInternships, icon: Briefcase, trend: "Live", color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Total Revenue", value: `₹${Number(stats.totalRevenue || 0).toLocaleString()}`, icon: DollarSign, trend: "Paid", color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Pending Certs", value: stats.pendingCerts, icon: Award, trend: "Need review", color: "text-amber-500", bg: "bg-amber-500/10" },
  ] : [];

  return (
    <div>
      {!stats ? (
        <div className="flex items-center justify-center py-20"><Spin /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {cards.map(({ label, value, icon: Icon, trend, color, bg }) => (
              <div key={label} className="bg-card border border-border rounded-2xl p-5 hover:border-primary/20 hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", bg)}>
                    <Icon className={cn("w-5 h-5", color)} />
                  </div>
                  <span className="text-xs text-emerald-500 font-semibold bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">{trend}</span>
                </div>
                <p className="font-display font-extrabold text-2xl text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Revenue Chart */}
          <div className="bg-card border border-border rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold text-foreground">Revenue Overview</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Monthly revenue and new students</p>
              </div>
              <Badge color="green">Live data</Badge>
            </div>
            {chartData.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">No revenue data yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#5b5cf6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#5b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="m" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", fontSize: "12px" }} formatter={(v: number) => [`₹${v.toLocaleString()}`, "Revenue"]} />
                <Area type="monotone" dataKey="revenue" stroke="#5b5cf6" strokeWidth={2} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
            )}
          </div>

          {/* Students bar chart */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="font-semibold text-foreground mb-6">New Enrollments by Month</h3>
            {chartData.length === 0 ? (
              <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">No enrollment data yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="m" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", fontSize: "12px" }} />
                <Bar dataKey="students" fill="#7c3aed" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function AdminStudents() {
  const [search, setSearch] = useState("");
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    api.admin.getUsers({ search })
      .then((data) => setStudents(data.users || []))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load students."))
      .finally(() => setLoading(false));
  }, [search]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display font-bold text-2xl text-foreground">All Students</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search students..." className="pl-9 pr-4 py-2 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground w-48" />
        </div>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-20"><Spin /></div>
      ) : error ? (
        <div className="text-center py-20 text-red-500"><AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-60" /><p>{error}</p></div>
      ) : students.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground"><Users className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No students found.</p></div>
      ) : (
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {["Student", "Enrollment No.", "College", "Joined", "Status"].map((h) => (
                <th key={h} className="text-left px-5 py-4 text-xs font-semibold text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s._id || s.college_email} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold flex-shrink-0">{(s.full_name || "S")[0]}</div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{s.full_name}</p>
                      <p className="text-xs text-muted-foreground">{s.college_email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 text-sm text-muted-foreground">{s.enrollment_no || "Not provided"}</td>
                <td className="px-5 py-4 text-sm text-muted-foreground max-w-[180px] truncate">{s.college_name || "Not provided"}</td>
                <td className="px-5 py-4 text-sm text-muted-foreground">{formatDate(s.created_at)}</td>
                <td className="px-5 py-4">
                  <Badge color={s.email_verified ? "green" : "amber"}>{s.email_verified ? "Verified" : "Pending"}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}

function AdminPrograms() {
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingProgram, setEditingProgram] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    category_code: "",
    category_name: "",
    description: "",
    icon: "📘",
    price_1m: "",
    price_3m: "",
    price_5m: "",
    total_tasks_1m: "4",
    total_tasks_3m: "8",
    total_tasks_5m: "14",
  });

  const loadPrograms = () => {
    setLoading(true);
    setError("");
    api.internships.getAll()
      .then(setPrograms)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load programs."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPrograms();
  }, []);

  const openCreateForm = () => {
    setEditingProgram(null);
    setForm({
      category_code: "",
      category_name: "",
      description: "",
      icon: "📘",
      price_1m: "",
      price_3m: "",
      price_5m: "",
      total_tasks_1m: "4",
      total_tasks_3m: "8",
      total_tasks_5m: "14",
    });
    setShowForm(true);
  };

  const openEditForm = (program: any) => {
    setEditingProgram(program);
    setForm({
      category_code: program.category_code || program.id || "",
      category_name: program.category_name || program.title || "",
      description: program.description || "",
      icon: program.icon || "📘",
      price_1m: String(program.price_1m ?? program.price ?? ""),
      price_3m: String(program.price_3m ?? program.originalPrice ?? ""),
      price_5m: String(program.price_5m ?? ""),
      total_tasks_1m: String(program.total_tasks_1m ?? program.projects ?? 4),
      total_tasks_3m: String(program.total_tasks_3m ?? program.modules ?? 8),
      total_tasks_5m: String(program.total_tasks_5m ?? 14),
    });
    setShowForm(true);
  };

  const updateForm = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
  };

  const submitProgram = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!form.category_code.trim() || !form.category_name.trim() || !form.description.trim()) {
      setError("Program code, name, and description are required.");
      return;
    }

    const payload = {
      category_code: form.category_code.trim().toUpperCase(),
      category_name: form.category_name.trim(),
      description: form.description.trim(),
      icon: form.icon.trim() || "📘",
      price_1m: Number(form.price_1m),
      price_3m: Number(form.price_3m),
      price_5m: Number(form.price_5m),
      total_tasks_1m: Number(form.total_tasks_1m),
      total_tasks_3m: Number(form.total_tasks_3m),
      total_tasks_5m: Number(form.total_tasks_5m),
      is_active: true,
    };

    if ([payload.price_1m, payload.price_3m, payload.price_5m].some((value) => Number.isNaN(value) || value < 0)) {
      setError("Program prices must be valid non-negative numbers.");
      return;
    }

    setSaving(true);
    try {
      if (editingProgram?._id) {
        await api.admin.updateInternship(editingProgram._id, payload);
      } else {
        await api.admin.createInternship(payload);
      }
      setShowForm(false);
      loadPrograms();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save program.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display font-bold text-2xl text-foreground">Programs</h2>
        <button onClick={openCreateForm} className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">+ Add Program</button>
      </div>
      {showForm && (
        <form onSubmit={submitProgram} className="bg-card border border-border rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">{editingProgram ? "Edit Program" : "Add Program"}</h3>
            <button type="button" onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-muted text-muted-foreground"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input value={form.category_code} onChange={updateForm("category_code")} placeholder="Code, e.g. AI" className="px-3.5 py-2.5 bg-input-background border border-border rounded-xl text-sm text-foreground" />
            <input value={form.category_name} onChange={updateForm("category_name")} placeholder="Program name" className="px-3.5 py-2.5 bg-input-background border border-border rounded-xl text-sm text-foreground" />
            <input value={form.icon} onChange={updateForm("icon")} placeholder="Icon" className="px-3.5 py-2.5 bg-input-background border border-border rounded-xl text-sm text-foreground" />
            <div className="grid grid-cols-3 gap-2">
              <input value={form.price_1m} onChange={updateForm("price_1m")} placeholder="1m price" type="number" min="0" className="px-3.5 py-2.5 bg-input-background border border-border rounded-xl text-sm text-foreground" />
              <input value={form.price_3m} onChange={updateForm("price_3m")} placeholder="3m price" type="number" min="0" className="px-3.5 py-2.5 bg-input-background border border-border rounded-xl text-sm text-foreground" />
              <input value={form.price_5m} onChange={updateForm("price_5m")} placeholder="5m price" type="number" min="0" className="px-3.5 py-2.5 bg-input-background border border-border rounded-xl text-sm text-foreground" />
            </div>
            <textarea value={form.description} onChange={updateForm("description")} placeholder="Description" rows={3} className="md:col-span-2 px-3.5 py-2.5 bg-input-background border border-border rounded-xl text-sm text-foreground resize-none" />
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-60">{saving ? "Saving..." : "Save Program"}</button>
          </div>
        </form>
      )}
      {loading ? (
        <div className="flex items-center justify-center py-20"><Spin /></div>
      ) : error ? (
        <div className="text-center py-20 text-red-500"><AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-60" /><p>{error}</p></div>
      ) : programs.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground"><Briefcase className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No programs found.</p></div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {programs.map((i) => (
          <div key={i.id} className="bg-card border border-border rounded-2xl p-5 flex items-start gap-4 hover:border-primary/20 transition-colors">
            <div className="w-16 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl flex-shrink-0">{i.icon || <Briefcase className="w-5 h-5 text-primary" />}</div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground text-sm truncate">{i.title}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge color="violet">{i.category}</Badge>
                <span className="text-xs text-muted-foreground">₹{i.price.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span><FileText className="w-3 h-3 inline mr-0.5" />{i.modules || 0} tasks</span>
                <span><CreditCard className="w-3 h-3 inline mr-0.5" />₹{Number(i.price_3m || 0).toLocaleString()} / 3 mo</span>
              </div>
            </div>
            <button onClick={() => openEditForm(i)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><MoreHorizontal className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
      )}
    </div>
  );
}

function AdminCerts() {
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadCertificates = () => {
    setLoading(true);
    setError("");
    api.admin.getCertificates()
      .then((data) => setCertificates(data.certificates || []))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load certificates."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCertificates();
  }, []);

  const handleRevoke = async (id: string) => {
    await api.admin.revokeCertificate(id);
    loadCertificates();
  };

  return (
    <div>
      <h2 className="font-display font-bold text-2xl text-foreground mb-6">Certificates</h2>
      {loading ? (
        <div className="flex items-center justify-center py-20"><Spin /></div>
      ) : error ? (
        <div className="text-center py-20 text-red-500"><AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-60" /><p>{error}</p></div>
      ) : certificates.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground"><Award className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No certificates found.</p></div>
      ) : (
      <div className="flex flex-col gap-4">
        {certificates.map((certificate) => {
          const enrollment = certificate.enrollment_id || {};
          const student = enrollment.user_id || {};
          const internship = enrollment.internship_id || {};
          return (
          <div key={certificate._id} className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
              <Award className="w-5 h-5 text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground text-sm">{student.full_name || certificate.full_name}</p>
              <p className="text-xs text-muted-foreground">{internship.category_name || certificate.internship_name} · {certificate.cert_id}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Issued: {formatDate(certificate.created_at)}</p>
            </div>
            <div className="flex gap-2">
              <Badge color={certificate.is_revoked ? "red" : "green"}>{certificate.is_revoked ? "Revoked" : "Active"}</Badge>
              {!certificate.is_revoked && (
                <button onClick={() => handleRevoke(certificate._id)} className="px-3 py-1.5 bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg text-xs font-semibold hover:bg-red-500/20 transition-colors">Revoke</button>
              )}
            </div>
          </div>
        );})}
      </div>
      )}
    </div>
  );
}

function AdminPmts() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    api.admin.getPayments()
      .then((data) => setPayments(data.payments || []))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load payments."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h2 className="font-display font-bold text-2xl text-foreground mb-6">Payments</h2>
      {loading ? (
        <div className="flex items-center justify-center py-20"><Spin /></div>
      ) : error ? (
        <div className="text-center py-20 text-red-500"><AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-60" /><p>{error}</p></div>
      ) : payments.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground"><CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No payments found.</p></div>
      ) : (
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {["ID", "Student", "Program", "Amount", "Method", "Date", "Status"].map((h) => (
                <th key={h} className="text-left px-5 py-4 text-xs font-semibold text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => {
              const enrollment = payment.enrollment_id || {};
              const student = enrollment.user_id || {};
              const internship = enrollment.internship_id || {};
              return (
              <tr key={payment._id || payment.razorpay_order_id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                <td className="px-5 py-4 text-xs font-mono text-muted-foreground">{payment.razorpay_payment_id || payment.razorpay_order_id}</td>
                <td className="px-5 py-4 text-sm text-foreground">{student.full_name || "Unknown"}</td>
                <td className="px-5 py-4 text-sm text-muted-foreground max-w-[140px] truncate">{internship.category_name || "Internship"}</td>
                <td className="px-5 py-4 text-sm font-bold text-foreground">₹{Number(payment.amount || 0).toLocaleString()}</td>
                <td className="px-5 py-4 text-sm text-muted-foreground">Razorpay</td>
                <td className="px-5 py-4 text-sm text-muted-foreground">{formatDate(payment.paid_at || payment.created_at)}</td>
                <td className="px-5 py-4"><Badge color={statusColor(payment.status)}>{payment.status || "created"}</Badge></td>
              </tr>
            );})}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}

// ── Certificate Verification ───────────────────────────────────────────────────
function CertVerifyPage() {
  const [certId, setCertId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [searched, setSearched] = useState(false);
  const verifiedCertificate = result?.certificate || result?.data || null;

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!certId.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await api.certificates.verify(certId.trim());
      setResult(res);
    } catch {
      setResult({ valid: false });
    } finally {
      setSearched(true);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-24 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <QrCode className="w-8 h-8 text-primary" />
          </div>
          <h1 className="font-display font-extrabold text-4xl text-foreground mb-3">Verify Certificate</h1>
          <p className="text-muted-foreground text-lg">Enter a Certificate ID to instantly verify its authenticity.</p>
        </div>

        <form onSubmit={handleVerify} className="flex gap-3 mb-3">
          <div className="relative flex-1">
            <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={certId} onChange={(e) => setCertId(e.target.value)}
              placeholder="e.g. RNA-2024-WD-001247"
              className="w-full pl-10 pr-4 py-3.5 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all font-mono" />
          </div>
          <button type="submit" disabled={loading || !certId.trim()}
            className="px-6 py-3.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-primary/20 flex-shrink-0">
            {loading ? <Spin /> : <><Search className="w-4 h-4" /> Verify</>}
          </button>
        </form>
        <p className="text-xs text-muted-foreground text-center mb-10">Enter the internship code printed on a certificate.</p>

        <AnimatePresence>
          {searched && result && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
              {result.valid ? (
                <div className="bg-card border border-emerald-200 dark:border-emerald-800 rounded-2xl overflow-hidden shadow-xl shadow-emerald-500/5">
                  {/* Header */}
                  <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-6 text-white">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                        <CheckCircle className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-bold text-lg">Certificate Verified</p>
                        <p className="text-white/70 text-sm">This certificate is authentic and active.</p>
                      </div>
                    </div>
                  </div>
                  {/* Details */}
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Award className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Issued by</p>
                            <p className="font-bold text-foreground">RedNotice Academy</p>
                          </div>
                        </div>
                      </div>
                      <div className="w-16 h-16 bg-muted rounded-xl flex items-center justify-center">
                        <QrCode className="w-9 h-9 text-muted-foreground" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      {[
                        { label: "Student Name", value: verifiedCertificate?.name || verifiedCertificate?.studentName },
                        { label: "Program", value: verifiedCertificate?.internship },
                        { label: "Duration", value: verifiedCertificate?.duration },
                        { label: "Issue Date", value: formatDate(verifiedCertificate?.issuedAt || verifiedCertificate?.issueDate) },
                        { label: "Certificate ID", value: verifiedCertificate?.certId || verifiedCertificate?.certificateId },
                        { label: "Status", value: "Active" },
                      ].map(({ label, value }) => (
                        <div key={label} className={cn("bg-muted/50 rounded-xl p-3.5", label === "Certificate ID" && "col-span-2")}>
                          <p className="text-xs text-muted-foreground mb-1">{label}</p>
                          <p className={cn("font-semibold text-foreground text-sm", label === "Certificate ID" && "font-mono text-xs", label === "Status" && "text-emerald-600 dark:text-emerald-400")}>{value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-3">
                      <button className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                        <Download className="w-4 h-4" /> Download Certificate
                      </button>
                      <button className="px-4 py-2.5 bg-muted text-muted-foreground rounded-xl text-sm font-semibold hover:bg-muted/80 transition-colors flex items-center gap-2">
                        <Copy className="w-4 h-4" /> Copy ID
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-card border border-red-200 dark:border-red-800 rounded-2xl p-8 text-center">
                  <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-7 h-7 text-red-500" />
                  </div>
                  <h3 className="font-bold text-xl text-foreground mb-2">Certificate Not Found</h3>
                  <p className="text-muted-foreground text-sm">No certificate found with ID <strong className="font-mono text-foreground">{certId}</strong>. Please check the ID and try again.</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── About Page ────────────────────────────────────────────────────────────────
function AboutPage() {
  return (
    <div className="pt-24 pb-24">
      {/* Hero */}
      <div className="max-w-4xl mx-auto px-6 text-center mb-20">
        <Badge color="violet">About Us</Badge>
        <h1 className="font-display font-extrabold text-5xl text-foreground mt-4 mb-5">We believe in learning by doing</h1>
        <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
          RedNotice Academy was built on a simple belief: the best way to learn is to build real things. We created internme to give every student access to structured, project-based internship programs with certificates that employers actually verify.
        </p>
      </div>

      {/* Team / Values */}
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          {[
            { icon: Target, title: "Our Mission", desc: "Make quality, career-relevant internship education accessible to every aspiring professional in India and beyond." },
            { icon: Trophy, title: "Our Vision", desc: "A world where every graduate enters the workforce with real, verified experience — not just a degree." },
            { icon: Globe, title: "Our Approach", desc: "Project-first learning, QR-verified certificates, and mentorship that bridges the gap between classroom and career." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-card border border-border rounded-2xl p-7 hover:border-primary/20 hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                <Icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-display font-bold text-xl text-foreground mb-2">{title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="bg-gradient-to-br from-indigo-950 via-violet-950 to-slate-900 rounded-3xl p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
          <div className="relative grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: "2021", label: "Founded" },
              { value: "10K+", label: "Students" },
              { value: "52+", label: "Programs" },
              { value: "8K+", label: "Certificates" },
            ].map(({ value, label }) => (
              <div key={label}>
                <p className="font-display font-extrabold text-4xl text-white mb-1">{value}</p>
                <p className="text-white/50 text-sm">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Contact Page ──────────────────────────────────────────────────────────────
function ContactPage() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });

  const update = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.name || !form.email || !form.message) {
      setError("Please fill in your name, email, and message.");
      return;
    }
    setLoading(true);
    try {
      await api.contact.send(form);
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't send your message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-24 pb-24 max-w-7xl mx-auto px-6">
      <div className="text-center mb-14">
        <Badge color="violet">Contact Us</Badge>
        <h1 className="font-display font-extrabold text-4xl text-foreground mt-4 mb-3">We&apos;d love to hear from you</h1>
        <p className="text-muted-foreground text-lg">Questions, feedback, or partnership inquiries — reach out anytime.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div>
          {sent ? (
            <div className="bg-card border border-emerald-200 dark:border-emerald-800 rounded-2xl p-12 text-center">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
              <h3 className="font-bold text-xl text-foreground mb-2">Message Sent!</h3>
              <p className="text-muted-foreground text-sm">We&apos;ll get back to you within 24 hours.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-7 flex flex-col gap-4">
              {error && (
                <div className="flex items-center gap-2.5 p-3.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                </div>
              )}
              {[
                { label: "Your Name", placeholder: "Priya Sharma", type: "text", field: "name" as const },
                { label: "Email", placeholder: "you@example.com", type: "email", field: "email" as const },
                { label: "Subject", placeholder: "How can we help?", type: "text", field: "subject" as const },
              ].map(({ label, placeholder, type, field }) => (
                <div key={label}>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">{label}</label>
                  <input type={type} value={form[field]} onChange={update(field)} placeholder={placeholder}
                    className="w-full px-4 py-3 bg-input-background border border-border rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all text-foreground" />
                </div>
              ))}
              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Message</label>
                <textarea rows={4} value={form.message} onChange={update("message")} placeholder="Tell us more..."
                  className="w-full px-4 py-3 bg-input-background border border-border rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all text-foreground resize-none" />
              </div>
              <button type="submit" disabled={loading} className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                {loading ? <Spin /> : "Send Message"}
              </button>
            </form>
          )}
        </div>

        <div className="flex flex-col gap-5">
          {[
            { icon: Mail, label: "Email Us", value: "hello@rednoticeacademy.com", sub: "We reply within 24 hours" },
            { icon: Phone, label: "Call Us", value: "+91 98765 43210", sub: "Mon–Fri, 9 AM to 6 PM IST" },
            { icon: MapPin, label: "Office", value: "Mumbai, Maharashtra, India", sub: "Visit by appointment" },
          ].map(({ icon: Icon, label, value, sub }) => (
            <div key={label} className="bg-card border border-border rounded-2xl p-6 flex items-center gap-5 hover:border-primary/20 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-5.5 h-5.5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                <p className="font-semibold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Pricing Page ──────────────────────────────────────────────────────────────
function PricingPage() {
  const { go } = useApp();
  const [programs, setPrograms] = useState<Internship[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.internships.getAll()
      .then((data) => setPrograms(data || []))
      .catch(() => setPrograms([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="pt-24 pb-24">
      <div className="max-w-4xl mx-auto px-6 text-center mb-14">
        <Badge color="violet">Pricing</Badge>
        <h1 className="font-display font-extrabold text-5xl text-foreground mt-4 mb-4">Simple, transparent pricing</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">One-time payment per program. No subscriptions, no hidden fees. All programs include certificates and QR verification.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Spin /></div>
      ) : programs.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No pricing available yet.</p>
        </div>
      ) : (
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
        {programs.map((i, idx) => (
          <motion.div key={i.id} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.07 }}
            className={cn("bg-card border rounded-2xl p-7 flex flex-col hover:shadow-xl transition-all duration-300", idx === 0 ? "border-primary shadow-lg shadow-primary/10" : "border-border hover:border-primary/30")}>
            {idx === 0 && (
              <div className="mb-4"><Badge color="violet">Most Popular</Badge></div>
            )}
            <h3 className="font-display font-bold text-xl text-foreground mb-1">{i.title}</h3>
            <p className="text-xs text-muted-foreground mb-5">{i.category} · {i.duration} · {i.level}</p>
            <div className="mb-6">
              <span className="font-display font-extrabold text-4xl text-foreground">₹{i.price.toLocaleString()}</span>
              {i.originalPrice && <span className="ml-2 text-muted-foreground line-through text-base">₹{i.originalPrice.toLocaleString()}</span>}
              {i.originalPrice && <div className="mt-1"><Badge color="green">{Math.round((1 - i.price / i.originalPrice) * 100)}% off</Badge></div>}
            </div>
            <div className="flex flex-col gap-2.5 mb-7 flex-1">
              {["Completion Certificate", "Project Certificate", "Experience Letter", "QR Verification", "Self-paced access", "24/7 support"].map((f) => (
                <div key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" /> {f}
                </div>
              ))}
            </div>
            <button onClick={() => go("detail", { id: i.id })}
              className={cn("w-full py-3 rounded-xl font-bold text-sm transition-all", idx === 0 ? "bg-primary text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/25" : "border border-border text-foreground hover:bg-muted hover:border-primary/30")}>
              View Program
            </button>
          </motion.div>
        ))}
      </div>
      )}

      <div className="max-w-3xl mx-auto px-6 text-center">
        <div className="bg-muted/50 border border-border rounded-2xl p-8">
          <Shield className="w-8 h-8 text-primary mx-auto mb-3" />
          <h3 className="font-bold text-xl text-foreground mb-2">7-Day Money-Back Guarantee</h3>
          <p className="text-muted-foreground text-sm">Not satisfied? Get a full refund within 7 days, no questions asked. Partial refunds available within 30 days if less than 30% of the program is completed.</p>
        </div>
      </div>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  );
  const [page, setPage] = useState<Page>("home");
  const [user, setUser] = useState<User | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [emailVerificationMessage, setEmailVerificationMessage] = useState("");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (!token || !window.location.pathname.includes("verify-email")) return;

    api.auth.verifyEmail(token)
      .then(() => setEmailVerificationMessage("Email verified successfully. You can sign in now."))
      .catch((err) => setEmailVerificationMessage(err instanceof ApiError ? err.message : "Email verification failed."))
      .finally(() => {
        window.history.replaceState({}, "", window.location.origin);
        setPage("login");
        setAuthChecked(true);
      });
  }, []);

  // Restore session on page load/refresh instead of always logging the user out.
  useEffect(() => {
    const restoreSession = async () => {
      const cachedUser = userStore.get();

      // Show cached user immediately so the UI doesn't flash logged-out
      if (cachedUser) setUser(cachedUser);

      try {
        const { user: freshUser } = await api.auth.me();
        setUser(freshUser);
        userStore.set(freshUser);
      } catch {
        // Token invalid/expired — clear the stale session
        tokenStore.clear();
        userStore.clear();
        setUser(null);
      } finally {
        setAuthChecked(true);
      }
    };
    restoreSession();
  }, []);

  const go = (p: Page, data?: { id?: string }) => {
    if (data?.id) setSelectedId(data.id);
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const isDash = page === "student" || page === "admin";

  const ctx: AppCtx = {
    theme,
    toggleTheme: () => setTheme((t) => (t === "light" ? "dark" : "light")),
    page, go, user,
    login: (u, token?: string) => {
      setUser(u);
      userStore.set(u);
      if (token) tokenStore.set(token);
    },
    logout: () => {
      void api.auth.logout();
      setUser(null);
      tokenStore.clear();
      userStore.clear();
      go("home");
    },
    selectedId,
  };

  // Avoid rendering protected pages until we know whether a session exists
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AppCtx.Provider value={ctx}>
      <style>{`
        :root { --font-display: 'Bricolage Grotesque', sans-serif; }
        .font-display { font-family: 'Bricolage Grotesque', sans-serif !important; }
        body { font-family: 'DM Sans', sans-serif; }
        * { scrollbar-width: thin; scrollbar-color: transparent transparent; }
        *:hover { scrollbar-color: rgba(0,0,0,0.12) transparent; }
        .dark *:hover { scrollbar-color: rgba(255,255,255,0.08) transparent; }
      `}</style>
      <div className="min-h-screen bg-background text-foreground font-sans">
        {!isDash && <Navbar />}
        {emailVerificationMessage && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 max-w-md w-[calc(100%-2rem)] bg-card border border-border rounded-xl shadow-lg px-4 py-3 text-sm text-foreground flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            {emailVerificationMessage}
          </div>
        )}
        <AnimatePresence mode="wait">
          <motion.div key={page} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18, ease: "easeInOut" }}>
            {page === "home" && <><LandingPage /><Footer /></>}
            {page === "internships" && <><InternshipsPage /><Footer /></>}
            {page === "detail" && <><InternshipDetailPage /><Footer /></>}
            {page === "login" && <LoginPage />}
            {page === "register" && <RegisterPage />}
            {page === "student" && <StudentDashboard />}
            {page === "admin" && <AdminDashboard />}
            {page === "verify" && <><CertVerifyPage /><Footer /></>}
            {page === "about" && <><AboutPage /><Footer /></>}
            {page === "contact" && <><ContactPage /><Footer /></>}
            {page === "pricing" && <><PricingPage /><Footer /></>}
          </motion.div>
        </AnimatePresence>
      </div>
    </AppCtx.Provider>
  );
}
