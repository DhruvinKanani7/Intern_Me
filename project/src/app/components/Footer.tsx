import React from "react";
import { GraduationCap, Globe, Mail, Phone, Shield } from "lucide-react";
import { useApp } from "../context/AppContext";
import { Page } from "../types";

export default function Footer() {
  const { go } = useApp();
  return (
    <footer className="border-t border-border bg-background mt-24">
      <div className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
              <GraduationCap className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight">
              intern<span className="text-primary">me</span>
            </span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
            RedNotice Academy&apos;s premium internship platform. Real programs, real projects, real certificates — verified by employers nationwide.
          </p>
          <div className="flex items-center gap-3 mt-6">
            {["Twitter", "LinkedIn", "Instagram", "YouTube"].map((s) => (
              <button
                key={s}
                aria-label={s}
                className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
              >
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
              <button
                key={l.label}
                onClick={() => go(l.page)}
                className="text-sm text-muted-foreground hover:text-primary transition-colors text-left"
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground mb-4">Legal</p>
          <div className="flex flex-col gap-3">
            {["Privacy Policy", "Terms of Service", "Refund Policy", "Contact Us"].map((l) => (
              <button
                key={l}
                onClick={() => go("contact")}
                className="text-sm text-muted-foreground hover:text-primary transition-colors text-left"
              >
                {l}
              </button>
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
          <p className="text-xs text-muted-foreground">
            © 2024 RedNotice Academy. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Shield className="w-3 h-3" /> Payments secured by Razorpay
          </p>
        </div>
      </div>
    </footer>
  );
}
