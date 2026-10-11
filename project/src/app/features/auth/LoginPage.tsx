import React, { useState, useEffect } from "react";
import { GraduationCap, Mail, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { api, ApiError } from "../../lib/api";
import { Spin } from "../../lib/helpers";

export default function LoginPage() {
  const { go, login } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    api.stats
      .get()
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    try {
      const { user, token } = await api.auth.login(email, password);
      login(user, token);
      go(user.role === "admin" ? "admin" : "student");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Invalid credentials. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-16 flex">
      {/* Left branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-950 via-violet-950 to-slate-900 items-center justify-center p-16 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "radial-gradient(circle at 50% 50%, white 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="relative text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center mx-auto mb-6">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h2 className="font-display font-extrabold text-4xl text-white mb-4">
            Welcome back
          </h2>
          <p className="text-white/60 text-lg max-w-sm">
            Continue your journey toward a verified internship certificate.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-4 text-center">
            {[
              { v: stats ? `${stats.totalStudents || 0}+` : "10K+", l: "Students" },
              { v: stats ? `${stats.totalPrograms || 0}+` : "52+", l: "Programs" },
              { v: stats ? `${stats.certificatesIssued || 0}+` : "8K+", l: "Certs Issued" },
              { v: stats ? `${stats.averageRating || 4.9}★` : "4.8★", l: "Avg Rating" },
            ].map(({ v, l }) => (
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
            <button
              onClick={() => go("register")}
              className="text-primary font-semibold hover:underline"
            >
              Create one
            </button>
          </p>

          {error && (
            <div className="flex items-center gap-2.5 p-3.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm mb-5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 bg-input-background border border-border rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  className="w-full pl-10 pr-10 py-3 bg-input-background border border-border rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => go("forgot-password")}
                className="text-xs text-primary hover:underline"
              >
                Forgot password?
              </button>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-bold text-base hover:opacity-90 transition-opacity shadow-lg shadow-primary/20 flex items-center justify-center gap-2 mt-1"
            >
              {loading ? <Spin /> : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
