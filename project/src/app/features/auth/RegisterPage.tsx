import React, { useState } from "react";
import { GraduationCap, Mail, Lock, UserCheck, Hash, AlertCircle } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { api, ApiError } from "../../lib/api";
import { Spin } from "../../lib/helpers";

export default function RegisterPage() {
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
    if (!/^[^\s@]+@[^\s@]+\.(edu|ac\.in)$/i.test(email))
      return "Please enter a valid college email ending in .edu or .ac.in.";
    if (!enrollmentNo.trim()) return "Please enter your enrollment number.";
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password))
      return "Password must be at least 8 characters and include uppercase, lowercase, and a number.";
    return "";
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      await api.auth.register({ name, email, password, enrollmentNo });
      setRegistered(true);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Something went wrong. Please try again."
      );
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
          <h1 className="font-display font-bold text-3xl text-foreground mb-2">
            {registered ? "Check your email" : "Create your account"}
          </h1>
          <p className="text-muted-foreground">
            {!registered ? (
              <>
                Already have an account?{" "}
                <button
                  onClick={() => go("login")}
                  className="text-primary font-semibold hover:underline"
                >
                  Sign in
                </button>
              </>
            ) : (
              <>
                We sent a verification link to{" "}
                <strong className="text-foreground">{email}</strong>
              </>
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
              {
                label: "Full Name",
                icon: UserCheck,
                value: name,
                setter: setName,
                type: "text",
                placeholder: "Priya Sharma",
              },
              {
                label: "College Email",
                icon: Mail,
                value: email,
                setter: setEmail,
                type: "email",
                placeholder: "you@college.edu",
              },
              {
                label: "Enrollment No.",
                icon: Hash,
                value: enrollmentNo,
                setter: setEnrollmentNo,
                type: "text",
                placeholder: "ENR2026001",
              },
              {
                label: "Password",
                icon: Lock,
                value: password,
                setter: setPassword,
                type: "password",
                placeholder: "Min. 8 characters",
              },
            ].map(({ label, icon: Icon, value, setter, type, placeholder }) => (
              <div key={label}>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">
                  {label}
                </label>
                <div className="relative">
                  <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type={type}
                    value={value}
                    onChange={(e) => setter(e.target.value)}
                    placeholder={placeholder}
                    className="w-full pl-10 pr-4 py-3 bg-input-background border border-border rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                  />
                </div>
              </div>
            ))}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-bold text-base hover:opacity-90 transition-opacity shadow-lg shadow-primary/20 flex items-center justify-center gap-2 mt-1"
            >
              {loading ? <Spin /> : "Create Account"}
            </button>
          </form>
        ) : (
          <div className="bg-card border border-border rounded-2xl p-6 text-center">
            <Mail className="w-10 h-10 text-primary mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-5">
              Open your inbox and click the link, then sign in.
            </p>
            <button
              type="button"
              onClick={() => go("login")}
              className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-bold text-base hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
            >
              Go to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
