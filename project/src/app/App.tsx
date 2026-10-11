import React, { lazy, Suspense, useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router";
import { Loader2, CheckCircle } from "lucide-react";
import { AppProvider, useApp } from "./context/AppContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { api, ApiError } from "./lib/api";

// Lazy-loaded route components for optimal bundle splitting
const LandingPage = lazy(() => import("./pages/LandingPage"));
const InternshipsPage = lazy(() => import("./features/internships/InternshipsPage"));
const InternshipDetailPage = lazy(() => import("./features/internships/InternshipDetailPage"));
const LoginPage = lazy(() => import("./features/auth/LoginPage"));
const RegisterPage = lazy(() => import("./features/auth/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("./features/auth/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./features/auth/ResetPasswordPage"));
const StudentDashboard = lazy(() => import("./features/dashboard/StudentDashboard"));
const AdminDashboard = lazy(() => import("./features/admin/AdminDashboard"));
const CertVerifyPage = lazy(() => import("./features/verify/CertVerifyPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const PricingPage = lazy(() => import("./pages/PricingPage"));

function PageLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}

function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="min-h-screen">{children}</main>
      <Footer />
    </>
  );
}

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useApp();
  const [emailVerificationMessage, setEmailVerificationMessage] = useState("");

  const isDash =
    location.pathname.startsWith("/student") || location.pathname.startsWith("/admin");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (!token || !location.pathname.includes("verify-email")) return;

    api.auth
      .verifyEmail(token)
      .then(() =>
        setEmailVerificationMessage("Email verified successfully. You can sign in now.")
      )
      .catch((err) =>
        setEmailVerificationMessage(
          err instanceof ApiError ? err.message : "Email verification failed."
        )
      )
      .finally(() => {
        navigate("/login", { replace: true });
      });
  }, [location.pathname, navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <style>{`
        :root { --font-display: 'Bricolage Grotesque', sans-serif; }
        .font-display { font-family: 'Bricolage Grotesque', sans-serif !important; }
        body { font-family: 'DM Sans', sans-serif; }
        * { scrollbar-width: thin; scrollbar-color: transparent transparent; }
        *:hover { scrollbar-color: rgba(0,0,0,0.12) transparent; }
        .dark *:hover { scrollbar-color: rgba(255,255,255,0.08) transparent; }
      `}</style>

      {emailVerificationMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 max-w-md w-[calc(100%-2rem)] bg-card border border-border rounded-xl shadow-lg px-4 py-3 text-sm text-foreground flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          {emailVerificationMessage}
        </div>
      )}

      <Suspense fallback={<PageLoading />}>
        <Routes>
          {/* Public content pages with standard layout */}
          <Route
            path="/"
            element={
              <MainLayout>
                <LandingPage />
              </MainLayout>
            }
          />
          <Route
            path="/internships"
            element={
              <MainLayout>
                <InternshipsPage />
              </MainLayout>
            }
          />
          <Route
            path="/internships/:id"
            element={
              <MainLayout>
                <InternshipDetailPage />
              </MainLayout>
            }
          />
          <Route
            path="/pricing"
            element={
              <MainLayout>
                <PricingPage />
              </MainLayout>
            }
          />
          <Route
            path="/about"
            element={
              <MainLayout>
                <AboutPage />
              </MainLayout>
            }
          />
          <Route
            path="/contact"
            element={
              <MainLayout>
                <ContactPage />
              </MainLayout>
            }
          />
          <Route
            path="/verify"
            element={
              <MainLayout>
                <CertVerifyPage />
              </MainLayout>
            }
          />
          <Route
            path="/verify/:code"
            element={
              <MainLayout>
                <CertVerifyPage />
              </MainLayout>
            }
          />

          {/* Authentication views (standalone with Navbar) */}
          <Route
            path="/login"
            element={
              <>
                <Navbar />
                <LoginPage />
              </>
            }
          />
          <Route
            path="/register"
            element={
              <>
                <Navbar />
                <RegisterPage />
              </>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <>
                <Navbar />
                <ForgotPasswordPage />
              </>
            }
          />
          <Route
            path="/reset-password"
            element={
              <>
                <Navbar />
                <ResetPasswordPage />
              </>
            }
          />

          {/* Feature dashboards (custom dedicated dashboard shells) */}
          <Route path="/student/*" element={<StudentDashboard />} />
          <Route path="/admin/*" element={<AdminDashboard />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
