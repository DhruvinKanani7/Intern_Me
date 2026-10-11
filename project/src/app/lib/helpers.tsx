import React from "react";
import { Star, Loader2 } from "lucide-react";
import { cn } from "../components/ui/utils";

export { cn };

export function Badge({
  children,
  color = "violet",
}: {
  children: React.ReactNode;
  color?: "violet" | "green" | "amber" | "red" | "blue" | "slate";
}) {
  const map: Record<string, string> = {
    violet: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
    green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    red: "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    slate: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide",
        map[color]
      )}
    >
      {children}
    </span>
  );
}

export function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            "w-3.5 h-3.5",
            i <= Math.round(rating)
              ? "fill-amber-400 text-amber-400"
              : "text-gray-300 dark:text-gray-600"
          )}
        />
      ))}
    </div>
  );
}

export function formatDate(value?: string | Date | null) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function enrollmentId(enrollment: any) {
  return enrollment?._id || enrollment?.id;
}

export function enrollmentInternship(enrollment: any) {
  return enrollment?.internship_id || enrollment?.internship || {};
}

export function enrollmentTitle(enrollment: any) {
  const internship = enrollmentInternship(enrollment);
  return internship?.category_name || internship?.title || "Internship";
}

export function enrollmentCode(enrollment: any) {
  const internship = enrollmentInternship(enrollment);
  return internship?.category_code || internship?.id || "";
}

export function enrollmentProgress(enrollment: any) {
  const current = Math.max(1, Number(enrollment?.current_task || 1));
  const total = Math.max(1, Number(enrollment?.total_tasks || 1));
  const completed = Math.min(total, Math.max(0, current - 1));
  return {
    completed,
    total,
    percentage: Math.round((completed / total) * 100),
  };
}

export function statusColor(
  status?: string
): "green" | "amber" | "red" | "blue" | "slate" | "violet" {
  if (status === "completed" || status === "approved" || status === "paid")
    return "green";
  if (
    status === "pending" ||
    status === "current" ||
    status === "active" ||
    status === "created"
  )
    return "amber";
  if (status === "rejected" || status === "failed" || status === "expired")
    return "red";
  if (status === "locked") return "slate";
  return "blue";
}

declare global {
  interface Window {
    Razorpay?: new (options: any) => { open: () => void };
  }
}

export function loadRazorpayScript() {
  return new Promise<boolean>((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    );
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

export function ProgressRing({
  pct,
  size = 64,
  stroke = 5,
}: {
  pct: number;
  size?: number;
  stroke?: number;
}) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        className="text-border"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        className="text-primary transition-all duration-700"
        strokeDasharray={circ}
        strokeDashoffset={circ - (pct / 100) * circ}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Spin() {
  return <Loader2 className="w-5 h-5 animate-spin" />;
}

export const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
