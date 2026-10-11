import React, { useState, useEffect } from "react";
import { useParams } from "react-router";
import {
  Star, Users, Clock, Target, Layers, Code2, Award, QrCode,
  HelpCircle, PlayCircle, Zap, Shield, Globe, AlertCircle,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { Internship } from "../../types";
import { TESTIMONIALS } from "../../constants/data";
import { api, ApiError } from "../../lib/api";
import { Badge, StarRow, Spin, cn, loadRazorpayScript } from "../../lib/helpers";

export default function InternshipDetailPage() {
  const { selectedId: ctxId, go, user } = useApp();
  const routeParams = useParams<{ id: string }>();
  const internshipId = routeParams.id || ctxId;

  const [activeTab, setActiveTab] = useState("overview");
  const [enrolling, setEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState("");
  const [intern, setIntern] = useState<Internship | null>(null);
  const [loadingIntern, setLoadingIntern] = useState(true);
  const [internError, setInternError] = useState("");
  const [selectedDuration, setSelectedDuration] = useState<1 | 3 | 5>(1);

  useEffect(() => {
    if (!internshipId) {
      setLoadingIntern(false);
      setInternError("No internship selected.");
      return;
    }
    setLoadingIntern(true);
    setInternError("");
    api.internships
      .getById(internshipId)
      .then((data) => {
        if (data) setIntern(data);
      })
      .catch((err) =>
        setInternError(
          err instanceof ApiError ? err.message : "Couldn't load this internship."
        )
      )
      .finally(() => setLoadingIntern(false));
  }, [internshipId]);

  const handleEnroll = async () => {
    if (!user) {
      go("login");
      return;
    }
    if (!intern) return;
    setEnrollError("");
    setEnrolling(true);
    try {
      const order = await api.enrollment.enroll(intern.id, String(selectedDuration));
      if (order.enrollmentId) {
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
      setEnrollError(
        err instanceof ApiError
          ? err.message
          : "Couldn't start enrollment. Please try again."
      );
    } finally {
      setEnrolling(false);
    }
  };

  const curriculum = [
    {
      week: "Week 1-2",
      topic: "Fundamentals & Setup",
      items: ["Environment Setup", "Core Concepts", "Tools Introduction"],
    },
    {
      week: "Week 3-6",
      topic: "Core Development",
      items: ["Module 1", "Module 2", "Hands-on Projects"],
    },
    {
      week: "Week 7-10",
      topic: "Advanced Topics",
      items: ["Advanced Patterns", "Performance", "Testing"],
    },
    {
      week: "Week 11-12",
      topic: "Capstone Project",
      items: ["Final Project Build", "Code Review", "Deployment"],
    },
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
        <h1 className="font-display font-bold text-2xl text-foreground mb-2">
          Internship unavailable
        </h1>
        <p className="text-muted-foreground mb-6">
          {internError || "Couldn't load this internship."}
        </p>
        <button
          onClick={() => go("internships")}
          className="px-5 py-3 rounded-xl bg-primary text-primary-foreground font-semibold"
        >
          View Programs
        </button>
      </div>
    );
  }

  const durationOptions: { months: 1 | 3 | 5; price: number }[] = [];
  if (intern.price_1m && intern.price_1m > 0)
    durationOptions.push({ months: 1, price: intern.price_1m });
  if (intern.price_3m && intern.price_3m > 0)
    durationOptions.push({ months: 3, price: intern.price_3m });
  if (intern.price_5m && intern.price_5m > 0)
    durationOptions.push({ months: 5, price: intern.price_5m });

  const selectedPrice =
    selectedDuration === 1
      ? intern.price_1m || intern.price
      : selectedDuration === 3
      ? intern.price_3m || intern.price
      : selectedDuration === 5
      ? intern.price_5m || intern.price
      : intern.price;

  return (
    <div className="pt-20">
      {/* Banner */}
      <div className="relative h-72 md:h-96 overflow-hidden bg-muted">
        <img
          src={intern.image}
          alt={intern.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-2 mb-3">
              <Badge color="violet">{intern.category}</Badge>
              {intern.badge && <Badge color="amber">{intern.badge}</Badge>}
            </div>
            <h1 className="font-display font-extrabold text-3xl md:text-5xl text-white mb-3">
              {intern.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-white/70 text-sm">
              <span className="flex items-center gap-1.5">
                <StarRow rating={intern.rating} />
                <strong className="text-white">{intern.rating}</strong> ({intern.reviews} reviews)
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                {intern.enrolled.toLocaleString()} enrolled
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {intern.duration}
              </span>
              <span className="flex items-center gap-1.5">
                <Target className="w-4 h-4" />
                {intern.level}
              </span>
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
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "px-5 py-3 text-sm font-semibold capitalize transition-all border-b-2 -mb-px",
                    activeTab === tab
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>

            {activeTab === "overview" && (
              <div>
                <h2 className="font-display font-bold text-2xl text-foreground mb-4">
                  About this program
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-8">
                  {intern.description}
                </p>
                <h3 className="font-semibold text-foreground mb-4">
                  Skills you&apos;ll learn
                </h3>
                <div className="flex flex-wrap gap-2 mb-8">
                  {intern.skills.map((s) => (
                    <span
                      key={s}
                      className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-sm font-medium"
                    >
                      {s}
                    </span>
                  ))}
                </div>
                <h3 className="font-semibold text-foreground mb-4">Program includes</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: Layers, label: `${intern.modules || 12} Learning Modules` },
                    { icon: Code2, label: `${intern.projects || 4} Real Projects` },
                    { icon: Award, label: "Verified Certificate" },
                    { icon: QrCode, label: "QR Verification" },
                    { icon: Clock, label: "Self-paced Learning" },
                    { icon: HelpCircle, label: "24/7 Support" },
                  ].map(({ icon: Icon, label }) => (
                    <div
                      key={label}
                      className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl"
                    >
                      <Icon className="w-4.5 h-4.5 text-primary flex-shrink-0" />
                      <span className="text-sm text-foreground">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "curriculum" && (
              <div>
                <h2 className="font-display font-bold text-2xl text-foreground mb-6">
                  Program Curriculum
                </h2>
                <div className="flex flex-col gap-4">
                  {curriculum.map((c, i) => (
                    <div
                      key={i}
                      className="border border-border rounded-xl overflow-hidden"
                    >
                      <div className="flex items-center gap-3 p-4 bg-muted/50">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                          {i + 1}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground text-sm">{c.topic}</p>
                          <p className="text-xs text-muted-foreground">{c.week}</p>
                        </div>
                      </div>
                      <div className="p-4">
                        {c.items.map((item) => (
                          <div
                            key={item}
                            className="flex items-center gap-2.5 py-1.5 text-sm text-muted-foreground"
                          >
                            <PlayCircle className="w-4 h-4 text-primary/60 flex-shrink-0" />{" "}
                            {item}
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
                <h2 className="font-display font-bold text-2xl text-foreground mb-6">
                  Student Reviews
                </h2>
                <div className="flex items-center gap-6 p-6 bg-card border border-border rounded-2xl mb-6">
                  <div className="text-center">
                    <p className="font-display font-extrabold text-6xl text-foreground">
                      {intern.rating}
                    </p>
                    <StarRow rating={intern.rating} />
                    <p className="text-xs text-muted-foreground mt-1">
                      {intern.reviews} reviews
                    </p>
                  </div>
                  <div className="flex-1 flex flex-col gap-2">
                    {[5, 4, 3, 2, 1].map((n) => (
                      <div key={n} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-3">{n}</span>
                        <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-400 rounded-full"
                            style={{
                              width: `${n === 5 ? 78 : n === 4 ? 15 : n === 3 ? 5 : 2}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {TESTIMONIALS.slice(0, 2).map((t) => (
                  <div key={t.name} className="border border-border rounded-xl p-5 mb-4">
                    <div className="flex items-center gap-3 mb-3">
                      <img
                        src={t.avatar}
                        alt={t.name}
                        className="w-9 h-9 rounded-full object-cover bg-muted"
                      />
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
                    <span className="font-display font-extrabold text-3xl text-foreground">
                      ₹{selectedPrice.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    for {selectedDuration} month{selectedDuration > 1 ? "s" : ""}
                  </p>

                  {durationOptions.length > 1 && (
                    <div className="grid grid-cols-3 gap-2 mt-4 mb-2">
                      {durationOptions.map((d) => (
                        <button
                          key={d.months}
                          type="button"
                          onClick={() => setSelectedDuration(d.months)}
                          className={cn(
                            "px-2 py-2.5 rounded-xl text-xs font-semibold border transition-all",
                            selectedDuration === d.months
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-muted-foreground hover:border-primary/40"
                          )}
                        >
                          {d.months} mo
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {enrollError && (
                  <div className="flex items-center gap-2 p-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-xs mb-3">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {enrollError}
                  </div>
                )}
                <button
                  onClick={handleEnroll}
                  disabled={enrolling}
                  className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-bold text-base hover:opacity-90 transition-opacity shadow-lg shadow-primary/30 flex items-center justify-center gap-2 mb-3"
                >
                  {enrolling ? (
                    <Spin />
                  ) : (
                    <>
                      <Zap className="w-4 h-4" /> Enroll Now
                    </>
                  )}
                </button>
                <p className="text-center text-xs text-muted-foreground mb-5">
                  7-day money-back guarantee
                </p>
                <div className="flex flex-col gap-3">
                  {[
                    { icon: Clock, label: `Duration: ${intern.duration}` },
                    { icon: Target, label: `Level: ${intern.level}` },
                    { icon: Layers, label: `${intern.modules || 12} modules` },
                    { icon: Code2, label: `${intern.projects || 4} projects` },
                    { icon: Award, label: "Verified certificate" },
                    { icon: Globe, label: "Self-paced, online" },
                  ].map(({ icon: Icon, label }) => (
                    <div
                      key={label}
                      className="flex items-center gap-2.5 text-sm text-muted-foreground"
                    >
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
