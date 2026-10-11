import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles, ArrowRight, QrCode, Users, Briefcase, Award, Star,
  Search, Code2, ChevronRight, CheckCircle, ChevronDown,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { Internship } from "../types";
import { TESTIMONIALS, FAQS } from "../constants/data";
import { api } from "../lib/api";
import { Badge, StarRow, Spin, cn } from "../lib/helpers";
import InternshipCard from "../components/InternshipCard";

export default function LandingPage() {
  const { go } = useApp();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [featuredInternships, setFeaturedInternships] = useState<Internship[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);

  const [statsData, setStatsData] = useState<any>(null);
  const [testimonialsList, setTestimonialsList] = useState<any[]>(TESTIMONIALS);

  useEffect(() => {
    api.internships
      .getAll()
      .then((data) => setFeaturedInternships((data || []).slice(0, 6)))
      .catch(() => setFeaturedInternships([]))
      .finally(() => setFeaturedLoading(false));

    api.stats
      .get()
      .then(setStatsData)
      .catch(() => setStatsData(null));

    api.testimonials
      .getAll()
      .then((data) => {
        if (data && data.length > 0) setTestimonialsList(data);
      })
      .catch(() => {});
  }, []);

  const stats = [
    {
      value: statsData ? `${statsData.totalStudents || 0}+` : "10K+",
      label: "Students Enrolled",
      icon: Users,
    },
    {
      value: statsData ? `${statsData.totalPrograms || 0}` : "52",
      label: "Internship Programs",
      icon: Briefcase,
    },
    {
      value: statsData ? `${statsData.certificatesIssued || 0}+` : "8K+",
      label: "Certificates Issued",
      icon: Award,
    },
    {
      value: statsData ? `${statsData.averageRating || 4.9}★` : "4.8★",
      label: "Average Rating",
      icon: Star,
    },
  ];

  const howItWorks = [
    {
      step: "01",
      title: "Browse & Enroll",
      desc: "Explore 52+ programs, compare pricing, and securely enroll with Razorpay in minutes.",
      icon: Search,
    },
    {
      step: "02",
      title: "Learn & Build",
      desc: "Complete modules, assignments, quizzes, and build real projects at your own pace.",
      icon: Code2,
    },
    {
      step: "03",
      title: "Get Certified",
      desc: "Earn your QR-verified certificate, download tamper-proof credentials, and share directly with employers.",
      icon: Award,
    },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-violet-950 to-slate-900" />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        {/* Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-violet-500/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 right-1/4 w-64 h-64 bg-purple-400/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-6 pt-28 pb-20 w-full">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white/90 border border-white/20 px-4 py-2 rounded-full text-sm font-medium mb-8"
            >
              <Sparkles className="w-4 h-4 text-violet-300" />
              RedNotice Academy — Trusted by 10,000+ Students
              <ArrowRight className="w-3.5 h-3.5 text-violet-300" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="font-display font-extrabold text-5xl sm:text-6xl lg:text-7xl text-white leading-[1.1] tracking-tight mb-6"
            >
              Launch Your Career
              <br />
              <span className="bg-gradient-to-r from-violet-300 via-purple-300 to-indigo-300 bg-clip-text text-transparent">
                with Real Experience
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg sm:text-xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed"
            >
              Complete industry-recognized internship programs, build real projects,
              and earn QR-verified certificates — all from one platform.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
            >
              <button
                onClick={() => go("internships")}
                className="px-8 py-4 bg-white text-slate-900 rounded-xl font-bold text-base hover:bg-white/90 transition-all shadow-2xl shadow-white/10 flex items-center gap-2 justify-center"
              >
                Browse Internships <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => go("verify")}
                className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white border border-white/20 rounded-xl font-semibold text-base hover:bg-white/20 transition-all flex items-center gap-2 justify-center"
              >
                <QrCode className="w-4 h-4" /> Verify Certificate
              </button>
            </motion.div>

            {/* Stats row */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.45 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-6 border-t border-white/10 pt-10"
            >
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
          <h2 className="font-display font-bold text-4xl text-foreground mt-4 mb-4">
            Three steps to your certificate
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            From enrollment to verified certificate in as little as 2 months.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {howItWorks.map(({ step, title, desc, icon: Icon }, i) => (
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="relative p-8 bg-card border border-border rounded-2xl group hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Icon className="w-5.5 h-5.5 text-primary" />
                </div>
                <span className="font-display font-extrabold text-5xl text-border group-hover:text-primary/20 transition-colors">
                  {step}
                </span>
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
              <h2 className="font-display font-bold text-4xl text-foreground mt-3">
                Top Internship Programs
              </h2>
            </div>
            <button
              onClick={() => go("internships")}
              className="hidden md:flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
            >
              View all programs <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {featuredLoading ? (
            <div className="flex items-center justify-center py-20">
              <Spin />
            </div>
          ) : featuredInternships.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No programs available yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredInternships.map((intern, i) => (
                <motion.div
                  key={intern.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07, duration: 0.5 }}
                  className="h-full"
                >
                  <InternshipCard intern={intern} />
                </motion.div>
              ))}
            </div>
          )}

          <div className="text-center mt-10 md:hidden">
            <button
              onClick={() => go("internships")}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity"
            >
              View All Programs
            </button>
          </div>
        </div>
      </section>

      {/* Certificate showcase */}
      <section className="py-24 max-w-7xl mx-auto px-6">
        <div className="rounded-3xl bg-gradient-to-br from-indigo-950 via-violet-950 to-slate-900 p-12 md:p-16 overflow-hidden relative">
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.1) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />
          <div className="relative grid md:grid-cols-2 gap-12 items-center">
            <div>
              <Badge color="violet">Certificates</Badge>
              <h2 className="font-display font-bold text-4xl text-white mt-4 mb-4">
                Certificates employers instantly trust
              </h2>
              <p className="text-white/60 text-lg leading-relaxed mb-8">
                Every certificate comes with a unique QR code. Employers scan it and are taken directly to our verification portal — no doubts, instant trust.
              </p>
              <div className="flex flex-col gap-3 mb-8">
                {[
                  "Internship Completion Certificate",
                  "Verified Digital Credential",
                  "Public Verification Portal",
                  "Instant QR Code Verification",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 text-white/80 text-sm">
                    <CheckCircle className="w-4.5 h-4.5 text-emerald-400 flex-shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
              <button
                onClick={() => go("verify")}
                className="px-6 py-3 bg-white text-slate-900 rounded-xl font-bold text-sm hover:bg-white/90 transition-all flex items-center gap-2"
              >
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
                  <p className="text-violet-300 font-semibold text-base mt-1">
                    Full Stack Web Development
                  </p>
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
            <h2 className="font-display font-bold text-4xl text-foreground mt-4 mb-3">
              What our students say
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Thousands of students have launched their careers through RedNotice Academy.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {testimonialsList.map((t, i) => (
              <motion.div
                key={t.name || i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                className="bg-card border border-border rounded-2xl p-7 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
              >
                <StarRow rating={t.rating || 5} />
                <p className="text-foreground text-base mt-4 mb-5 leading-relaxed">
                  &ldquo;{t.text}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  {t.avatar ? (
                    <img
                      src={t.avatar}
                      alt={t.name}
                      className="w-10 h-10 rounded-full object-cover bg-muted"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">
                      {t.name ? t.name[0] : "S"}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.role}
                      {t.company ? ` at ${t.company}` : ""}
                    </p>
                  </div>
                  {t.program && (
                    <div className="ml-auto">
                      <Badge color="slate">{t.program}</Badge>
                    </div>
                  )}
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
            <h2 className="font-display font-bold text-4xl text-foreground mt-4 mb-3">
              Frequently asked questions
            </h2>
          </div>
          <div className="flex flex-col gap-3">
            {FAQS.map((faq, i) => (
              <div
                key={i}
                className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/20 transition-colors"
              >
                <button
                  className="w-full flex items-center justify-between px-6 py-4 text-left"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="font-semibold text-foreground text-sm">{faq.q}</span>
                  <ChevronDown
                    className={cn(
                      "w-4.5 h-4.5 text-muted-foreground transition-transform duration-200 flex-shrink-0 ml-4",
                      openFaq === i && "rotate-180"
                    )}
                  />
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <p className="px-6 pb-5 text-sm text-muted-foreground leading-relaxed">
                        {faq.a}
                      </p>
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
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "radial-gradient(circle at 30% 50%, rgba(255,255,255,0.3) 0%, transparent 60%)",
            }}
          />
          <div className="relative">
            <h2 className="font-display font-extrabold text-4xl text-white mb-4">
              Ready to start your internship?
            </h2>
            <p className="text-primary-foreground/70 text-lg mb-8 max-w-lg mx-auto">
              Join 10,000+ students who have launched their careers with RedNotice Academy.
            </p>
            <button
              onClick={() => go("internships")}
              className="px-8 py-4 bg-white text-primary rounded-xl font-bold text-base hover:opacity-90 transition-opacity shadow-xl inline-flex items-center gap-2"
            >
              Browse All Programs <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
