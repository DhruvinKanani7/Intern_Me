import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Briefcase, CheckCircle, Shield } from "lucide-react";
import { useApp } from "../context/AppContext";
import { Internship } from "../types";
import { api } from "../lib/api";
import { Badge, Spin, cn } from "../lib/helpers";

export default function PricingPage() {
  const { go } = useApp();
  const [programs, setPrograms] = useState<Internship[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.internships
      .getAll()
      .then((data) => setPrograms(data || []))
      .catch(() => setPrograms([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="pt-24 pb-24">
      <div className="max-w-4xl mx-auto px-6 text-center mb-14">
        <Badge color="violet">Pricing</Badge>
        <h1 className="font-display font-extrabold text-5xl text-foreground mt-4 mb-4">
          Simple, transparent pricing
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          One-time payment per program. No subscriptions, no hidden fees. All programs include
          certificates and QR verification.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spin />
        </div>
      ) : programs.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No pricing available yet.</p>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {programs.map((i, idx) => (
            <motion.div
              key={i.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.07 }}
              className={cn(
                "bg-card border rounded-2xl p-7 flex flex-col hover:shadow-xl transition-all duration-300",
                idx === 0
                  ? "border-primary shadow-lg shadow-primary/10"
                  : "border-border hover:border-primary/30"
              )}
            >
              {idx === 0 && (
                <div className="mb-4">
                  <Badge color="violet">Most Popular</Badge>
                </div>
              )}
              <h3 className="font-display font-bold text-xl text-foreground mb-1">{i.title}</h3>
              <p className="text-xs text-muted-foreground mb-5">
                {i.category} · {i.duration} · {i.level}
              </p>
              <div className="mb-6">
                <span className="font-display font-extrabold text-4xl text-foreground">
                  ₹{i.price.toLocaleString()}
                </span>
                {i.originalPrice && (
                  <span className="ml-2 text-muted-foreground line-through text-base">
                    ₹{i.originalPrice.toLocaleString()}
                  </span>
                )}
                {i.originalPrice && (
                  <div className="mt-1">
                    <Badge color="green">
                      {Math.round((1 - i.price / i.originalPrice) * 100)}% off
                    </Badge>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2.5 mb-7 flex-1">
                {[
                  "Completion Certificate",
                  "Project Certificate",
                  "Experience Letter",
                  "QR Verification",
                  "Self-paced access",
                  "24/7 support",
                ].map((f) => (
                  <div key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" /> {f}
                  </div>
                ))}
              </div>
              <button
                onClick={() => go("detail", { id: i.id })}
                className={cn(
                  "w-full py-3 rounded-xl font-bold text-sm transition-all",
                  idx === 0
                    ? "bg-primary text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/25"
                    : "border border-border text-foreground hover:bg-muted hover:border-primary/30"
                )}
              >
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
          <p className="text-muted-foreground text-sm">
            Not satisfied? Get a full refund within 7 days, no questions asked. Partial refunds
            available within 30 days if less than 30% of the program is completed.
          </p>
        </div>
      </div>
    </div>
  );
}
