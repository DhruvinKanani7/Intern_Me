import React from "react";
import { Target, Trophy, Globe } from "lucide-react";
import { Badge } from "../lib/helpers";

export default function AboutPage() {
  return (
    <div className="pt-24 pb-24">
      {/* Hero */}
      <div className="max-w-4xl mx-auto px-6 text-center mb-20">
        <Badge color="violet">About Us</Badge>
        <h1 className="font-display font-extrabold text-5xl text-foreground mt-4 mb-5">
          We believe in learning by doing
        </h1>
        <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
          RedNotice Academy was built on a simple belief: the best way to learn is to build real
          things. We created internme to give every student access to structured, project-based
          internship programs with certificates that employers actually verify.
        </p>
      </div>

      {/* Team / Values */}
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          {[
            {
              icon: Target,
              title: "Our Mission",
              desc: "Make quality, career-relevant internship education accessible to every aspiring professional in India and beyond.",
            },
            {
              icon: Trophy,
              title: "Our Vision",
              desc: "A world where every graduate enters the workforce with real, verified experience — not just a degree.",
            },
            {
              icon: Globe,
              title: "Our Approach",
              desc: "Project-first learning, QR-verified certificates, and mentorship that bridges the gap between classroom and career.",
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="bg-card border border-border rounded-2xl p-7 hover:border-primary/20 hover:shadow-lg transition-all"
            >
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
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />
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
