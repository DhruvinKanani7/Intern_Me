import React, { useState } from "react";
import { Mail, AlertCircle, CheckCircle } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { api, ApiError } from "../../lib/api";
import { Spin } from "../../lib/helpers";

export default function ForgotPasswordPage() {
  const { go } = useApp();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Please provide a valid college email address.");
      return;
    }
    setLoading(true);
    try {
      await api.auth.forgotPassword(email.trim());
      setSubmitted(true);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Couldn't send reset link. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-16 flex items-center justify-center p-8">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 shadow-sm">
        <h1 className="font-display font-bold text-3xl text-foreground mb-2">Reset Password</h1>
        <p className="text-muted-foreground text-sm mb-6">
          Enter your registered college email and we&apos;ll send you a password reset link.
        </p>

        {submitted ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 text-sm">
              <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Check your inbox</p>
                <p className="text-xs mt-1 text-emerald-700 dark:text-emerald-400">
                  If an account with this email exists, a reset link has been sent. It expires in 1 hour.
                </p>
              </div>
            </div>
            <button
              onClick={() => go("login")}
              className="w-full py-3 bg-muted text-foreground rounded-xl font-medium text-sm hover:bg-muted/80 transition-colors"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div className="flex items-center gap-2.5 p-3.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
              </div>
            )}
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">
                College Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@college.edu"
                  className="w-full pl-10 pr-4 py-3 bg-input-background border border-border rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-bold text-base hover:opacity-90 transition-opacity shadow-lg shadow-primary/20 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? <Spin /> : "Send Reset Link"}
            </button>
            <div className="text-center mt-2">
              <button
                type="button"
                onClick={() => go("login")}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Remember your password?{" "}
                <span className="text-primary font-semibold hover:underline">Sign In</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
