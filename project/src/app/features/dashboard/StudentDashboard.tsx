import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  GraduationCap, Briefcase, FileText, Award, CreditCard,
  Settings, Home, Sun, Moon, LogOut, Menu, Bell, Clock,
  Calendar, Hash, ExternalLink, ArrowUpRight, X, Download,
  Check, Copy, QrCode, CheckCircle, AlertCircle, Edit3,
  ChevronRight, ArrowRight,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { User, Page, StudentTab } from "../../types";
import { api, ApiError } from "../../lib/api";
import {
  Badge,
  formatDate,
  enrollmentId,
  enrollmentInternship,
  enrollmentTitle,
  enrollmentProgress,
  statusColor,
  ProgressRing,
  Spin,
  cn,
} from "../../lib/helpers";

function Plus({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export default function StudentDashboard() {
  const { user, go, theme, toggleTheme, logout } = useApp();
  const [tab, setTab] = useState<StudentTab>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");

  useEffect(() => {
    if (!user) return;
    setDashboardLoading(true);
    setDashboardError("");
    Promise.all([
      api.enrollment.getMyEnrollments(),
      api.certificates.getMyCertificates(),
      api.payments.getMyPayments(),
    ])
      .then(([enrollmentData, certificateData, paymentData]) => {
        setEnrollments(enrollmentData || []);
        setCertificates(certificateData || []);
        setPayments(paymentData || []);
      })
      .catch((err) => {
        setDashboardError(
          err instanceof ApiError ? err.message : "Couldn't load your dashboard."
        );
        setEnrollments([]);
        setCertificates([]);
        setPayments([]);
      })
      .finally(() => setDashboardLoading(false));
  }, [user]);

  useEffect(() => {
    if (!user) go("login");
  }, [user]);

  if (!user) return null;

  const navItems: { label: string; tab: StudentTab; icon: React.ElementType }[] = [
    { label: "Overview", tab: "overview", icon: Home },
    { label: "My Internships", tab: "internships", icon: Briefcase },
    { label: "Assignments", tab: "assignments", icon: FileText },
    { label: "Certificates", tab: "certs", icon: Award },
    { label: "Payments", tab: "payments", icon: CreditCard },
    { label: "Profile", tab: "profile", icon: Settings },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full py-6">
      <div className="px-5 mb-8">
        <button onClick={() => go("home")} className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <span className="font-display font-bold text-lg tracking-tight text-foreground">
            intern<span className="text-primary">me</span>
          </span>
        </button>
      </div>
      <div className="px-3 flex-1">
        {navItems.map(({ label, tab: t, icon: Icon }) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              setSidebarOpen(false);
            }}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 text-sm font-medium transition-all",
              tab === t
                ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <Icon className="w-4.5 h-4.5 flex-shrink-0" /> {label}
          </button>
        ))}
      </div>
      <div className="px-3 border-t border-border pt-4">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all mb-1"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          {theme === "dark" ? "Light Mode" : "Dark Mode"}
        </button>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex flex-col w-60 border-r border-border bg-sidebar flex-shrink-0 fixed left-0 top-0 bottom-0 overflow-y-auto">
        {sidebarContent}
      </aside>

      {/* Sidebar mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-30"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 400, damping: 40 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 w-64 bg-sidebar border-r border-border z-40 overflow-y-auto"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 lg:ml-60 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-background/90 backdrop-blur-xl border-b border-border h-16 flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-muted"
              onClick={() => setSidebarOpen(true)}
              aria-label="Toggle sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="font-display font-semibold text-foreground capitalize text-lg">
              {navItems.find((n) => n.tab === tab)?.label}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="p-2 rounded-lg hover:bg-muted text-muted-foreground relative"
                aria-label="View notifications"
              >
                <Bell className="w-4.5 h-4.5" />
                {enrollments.length > 0 && (
                  <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
                )}
              </button>
              {notifOpen && (
                <div
                  role="dialog"
                  aria-modal="true"
                  className="absolute right-0 top-12 w-80 bg-card border border-border shadow-xl rounded-2xl p-4 z-50"
                >
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-border">
                    <h4 className="font-semibold text-sm text-foreground">Notifications</h4>
                    <button
                      onClick={() => setNotifOpen(false)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Close
                    </button>
                  </div>
                  <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                    {enrollments.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-3 text-center">
                        No new notifications
                      </p>
                    ) : (
                      enrollments.map((en: any) => (
                        <div
                          key={en._id}
                          className="p-2.5 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors text-xs"
                        >
                          <p className="font-semibold text-foreground">{enrollmentTitle(en)}</p>
                          <p className="text-muted-foreground mt-0.5">
                            Task {en.current_task || 1} of {en.total_tasks || 4} in progress
                          </p>
                          {en.current_task_due_at && (
                            <p className="text-amber-500 mt-1 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Due: {formatDate(en.current_task_due_at)}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg">
              <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
                {user.name[0]}
              </div>
              <span className="text-sm font-medium text-foreground hidden sm:block">
                {user.name.split(" ")[0]}
              </span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6">
          {dashboardError && (
            <div className="mb-5 flex items-center gap-2.5 p-3.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {dashboardError}
            </div>
          )}
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {tab === "overview" && (
                <StudentOverview
                  user={user}
                  go={go}
                  setTab={setTab}
                  enrollments={enrollments}
                  certificates={certificates}
                  loading={dashboardLoading}
                />
              )}
              {tab === "internships" && (
                <StudentInternships
                  go={go}
                  enrollments={enrollments}
                  loading={dashboardLoading}
                />
              )}
              {tab === "assignments" && <StudentAssignments enrollments={enrollments} />}
              {tab === "certs" && (
                <StudentCerts
                  certificates={certificates}
                  loading={dashboardLoading}
                />
              )}
              {tab === "payments" && <StudentPayments payments={payments} />}
              {tab === "profile" && <StudentProfile user={user} />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

function StudentOverview({
  user,
  go,
  setTab,
  enrollments,
  certificates,
  loading,
}: {
  user: User;
  go: (p: Page) => void;
  setTab: (t: StudentTab) => void;
  enrollments: any[];
  certificates: any[];
  loading: boolean;
}) {
  const activeEnrollments = enrollments.filter((enrollment) => enrollment.status === "active");
  const completedEnrollments = enrollments.filter(
    (enrollment) => enrollment.status === "completed"
  );
  const currentEnrollment = activeEnrollments[0] || enrollments[0];
  const progress = currentEnrollment
    ? enrollmentProgress(currentEnrollment)
    : { completed: 0, total: 0, percentage: 0 };
  const cards = [
    {
      label: "Enrolled Programs",
      value: String(enrollments.length),
      icon: Briefcase,
      color: "text-violet-500",
      bg: "bg-violet-500/10",
    },
    {
      label: "Completed",
      value: String(completedEnrollments.length),
      icon: CheckCircle,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Certificates",
      value: String(certificates.length),
      icon: Award,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      label: "Assignments Done",
      value: String(
        enrollments.reduce(
          (sum, enrollment) => sum + enrollmentProgress(enrollment).completed,
          0
        )
      ),
      icon: FileText,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spin />
      </div>
    );
  }

  return (
    <div>
      {/* Welcome */}
      <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-7 mb-6 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-white/70 text-sm mb-1">Welcome back 👋</p>
            <h2 className="font-display font-extrabold text-3xl text-white mb-2">
              {user.name}
            </h2>
            <p className="text-white/60 text-sm">
              {currentEnrollment
                ? `You're ${progress.percentage}% through ${enrollmentTitle(currentEnrollment)}.`
                : "Browse programs to start your first internship."}
            </p>
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => (currentEnrollment ? setTab("internships") : go("internships"))}
                className="px-4 py-2 bg-white text-violet-700 rounded-lg text-sm font-bold hover:bg-white/90 transition-colors flex items-center gap-1.5"
              >
                {currentEnrollment ? "Continue Learning" : "Browse Programs"}{" "}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          {currentEnrollment && (
            <div className="relative flex-shrink-0">
              <ProgressRing pct={progress.percentage} size={80} stroke={6} />
              <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm">
                {progress.percentage}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map(({ label, value, icon: Icon, color, bg }) => (
          <div
            key={label}
            className="bg-card border border-border rounded-2xl p-5 hover:border-primary/20 hover:shadow-md transition-all"
          >
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", bg)}>
              <Icon className={cn("w-5 h-5", color)} />
            </div>
            <p className="font-display font-bold text-2xl text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Current internship */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-foreground">Current Internship</h3>
          <button
            onClick={() => setTab("internships")}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            View all <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        {currentEnrollment ? (
          <>
            <div className="flex items-start gap-4">
              <div className="w-16 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-xl flex-shrink-0">
                {enrollmentInternship(currentEnrollment)?.icon || (
                  <Briefcase className="w-5 h-5 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm mb-1 truncate">
                  {enrollmentTitle(currentEnrollment)}
                </p>
                <div className="flex items-center gap-2 mb-3">
                  <Badge color={statusColor(currentEnrollment.status)}>
                    {currentEnrollment.status || "active"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {progress.percentage}% complete
                  </span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress.percentage}%` }}
                    transition={{ duration: 1, delay: 0.3 }}
                    className="h-full bg-primary rounded-full"
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-5">
              {[
                {
                  label: "Tasks",
                  value: `${progress.completed}/${progress.total}`,
                  status: "amber" as const,
                },
                {
                  label: "Duration",
                  value: `${currentEnrollment.duration_months || 0} mo`,
                  status: "blue" as const,
                },
                {
                  label: "Certificate",
                  value: currentEnrollment.status === "completed" ? "Eligible" : "Locked",
                  status:
                    currentEnrollment.status === "completed"
                      ? ("green" as const)
                      : ("slate" as const),
                },
              ].map(({ label, value, status }) => (
                <div key={label} className="bg-muted/50 rounded-xl p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">{label}</p>
                  <Badge color={status}>{value}</Badge>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-10 text-muted-foreground">
            <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No active internship yet.</p>
          </div>
        )}
      </div>

      {/* Notifications */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="font-semibold text-foreground mb-4">Recent Notifications</h3>
        <div className="flex items-start gap-3 py-3">
          <Bell className="w-4.5 h-4.5 flex-shrink-0 mt-0.5 text-violet-500" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground">
              {currentEnrollment
                ? `Next task: ${Math.min(
                    Number(currentEnrollment.current_task || 1),
                    Number(currentEnrollment.total_tasks || 1)
                  )} of ${currentEnrollment.total_tasks}.`
                : "Enroll in a program to receive task updates here."}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Updated from your enrollment data
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StudentInternships({
  go,
  enrollments,
  loading,
}: {
  go: (p: Page, d?: { id?: string }) => void;
  enrollments: any[];
  loading: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display font-bold text-2xl text-foreground">My Internships</h2>
        <button
          onClick={() => go("internships")}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Browse More
        </button>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spin />
        </div>
      ) : enrollments.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="mb-4">No internships enrolled yet.</p>
          <button
            onClick={() => go("internships")}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold"
          >
            Browse Programs
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {enrollments.map((enrollment) => {
            const progress = enrollmentProgress(enrollment);
            return (
              <div
                key={enrollmentId(enrollment)}
                className="bg-card border border-border rounded-2xl p-6"
              >
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-20 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-2xl flex-shrink-0">
                    {enrollmentInternship(enrollment)?.icon || (
                      <Briefcase className="w-6 h-6 text-primary" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-foreground">
                        {enrollmentTitle(enrollment)}
                      </h3>
                      <Badge color={statusColor(enrollment.status)}>
                        {enrollment.status || "active"}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-3">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> {enrollment.duration_months} months
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> Started{" "}
                        {formatDate(enrollment.start_date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Hash className="w-3.5 h-3.5" /> {enrollment.internship_code}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progress.percentage}%` }}
                          transition={{ duration: 1 }}
                          className="h-full bg-primary rounded-full"
                        />
                      </div>
                      <span className="text-xs font-semibold text-foreground">
                        {progress.percentage}%
                      </span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    {
                      label: "Tasks",
                      value: `${progress.completed}/${progress.total}`,
                      pct: progress.percentage,
                      color: "bg-violet-500",
                    },
                    {
                      label: "Current Task",
                      value: `${enrollment.current_task || 1}`,
                      pct: Math.min(
                        100,
                        (Number(enrollment.current_task || 1) /
                          Math.max(1, Number(enrollment.total_tasks || 1))) *
                          100
                      ),
                      color: "bg-amber-500",
                    },
                    {
                      label: "Amount Paid",
                      value: `₹${Number(enrollment.amount_paid || 0).toLocaleString()}`,
                      pct: 100,
                      color: "bg-blue-500",
                    },
                  ].map(({ label, value, pct, color }) => (
                    <div key={label} className="bg-muted/50 rounded-xl p-4">
                      <p className="text-xs text-muted-foreground mb-1">{label}</p>
                      <p className="font-bold text-foreground text-lg">{value}</p>
                      <div className="mt-2 h-1 bg-border rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full", color)}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StudentAssignments({ enrollments }: { enrollments: any[] }) {
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState("");
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitTask, setSubmitTask] = useState<any>(null);

  useEffect(() => {
    if (!enrollments.length) {
      setSelectedEnrollmentId("");
      setTasks([]);
      return;
    }
    const stillExists = enrollments.some(
      (enrollment) => enrollmentId(enrollment) === selectedEnrollmentId
    );
    if (!selectedEnrollmentId || !stillExists) {
      setSelectedEnrollmentId(enrollmentId(enrollments[0]));
    }
  }, [enrollments, selectedEnrollmentId]);

  const fetchTasks = () => {
    if (!selectedEnrollmentId) return;
    setLoading(true);
    setError("");
    return api.tasks
      .getAll(selectedEnrollmentId)
      .then((data) => setTasks(data || []))
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Couldn't load assignments.")
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTasks();
  }, [selectedEnrollmentId]);

  const statusConfig: Record<
    string,
    { color: "green" | "amber" | "red" | "slate" | "blue"; label: string }
  > = {
    completed: { color: "green", label: "Completed" },
    approved: { color: "green", label: "Approved" },
    current: { color: "amber", label: "Current" },
    pending: { color: "amber", label: "Pending Review" },
    rejected: { color: "red", label: "Rejected" },
    locked: { color: "slate", label: "Locked" },
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h2 className="font-display font-bold text-2xl text-foreground">Assignments</h2>
        {enrollments.length > 1 && (
          <select
            value={selectedEnrollmentId}
            onChange={(e) => setSelectedEnrollmentId(e.target.value)}
            aria-label="Select enrollment for assignments"
            className="px-4 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          >
            {enrollments.map((enrollment) => (
              <option key={enrollmentId(enrollment)} value={enrollmentId(enrollment)}>
                {enrollmentTitle(enrollment)}
              </option>
            ))}
          </select>
        )}
      </div>
      {enrollments.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No assignments yet. Enroll in a program to unlock tasks.</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-20">
          <Spin />
        </div>
      ) : error ? (
        <div className="text-center py-20 text-red-500">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-60" />
          <p>{error}</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No tasks found for this enrollment.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {tasks.map((task) => (
            <div
              key={task.task_number}
              className="bg-card border border-border rounded-2xl p-5 hover:border-primary/20 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-1">
                    {task.title || `Task ${task.task_number}`}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>Task {task.task_number}</span>
                    {task.deadline_days && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> Deadline: {task.deadline_days} days
                      </span>
                    )}
                  </div>
                  {task.description && (
                    <p className="text-sm text-muted-foreground mt-3">{task.description}</p>
                  )}
                  {task.submission?.linkedin_url && (
                    <a
                      href={task.submission.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline mt-2 inline-flex items-center gap-1"
                    >
                      View submission <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge color={(statusConfig[task.status] || { color: "blue" }).color}>
                    {(statusConfig[task.status] || { label: task.status || "Open" }).label}
                  </Badge>
                </div>
              </div>
              {task.status === "rejected" && task.submission?.review_notes && (
                <p className="text-xs text-red-500 mt-2">
                  Reviewer note: {task.submission.review_notes}
                </p>
              )}
              {(task.status === "current" || task.status === "rejected") && (
                <button
                  onClick={() => setSubmitTask(task)}
                  className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />{" "}
                  {task.status === "rejected" ? "Resubmit Assignment" : "Submit Assignment"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      <SubmitTaskModal
        task={submitTask}
        enrollmentId={selectedEnrollmentId}
        onClose={() => setSubmitTask(null)}
        onSubmitted={() => {
          setSubmitTask(null);
          fetchTasks();
        }}
      />
    </div>
  );
}

function SubmitTaskModal({
  task,
  enrollmentId: eId,
  onClose,
  onSubmitted,
}: {
  task: any;
  enrollmentId: string;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLinkedinUrl(task?.submission?.linkedin_url || "");
    setError("");
  }, [task]);

  if (!task) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkedinUrl.trim()) {
      setError("Please enter your LinkedIn post URL.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await api.tasks.submit(eId, linkedinUrl.trim());
      onSubmitted();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Couldn't submit your assignment. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.2 }}
          role="dialog"
          aria-modal="true"
          className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-bold text-lg text-foreground">Submit Assignment</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                {task.title || `Task ${task.task_number}`}
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close submit dialog"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
              LinkedIn Post URL
            </label>
            <input
              type="url"
              required
              autoFocus
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              placeholder="https://www.linkedin.com/posts/..."
              className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Post about what you built for this task on LinkedIn and paste the link here.
            </p>
            {error && (
              <p className="text-xs text-red-500 mt-2 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
              </p>
            )}
            <div className="flex gap-3 mt-5">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 bg-muted text-muted-foreground rounded-xl text-sm font-semibold hover:bg-muted/80 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? <Spin /> : "Submit"}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function StudentCerts({
  certificates,
  loading,
}: {
  certificates: any[];
  loading: boolean;
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div>
      <h2 className="font-display font-bold text-2xl text-foreground mb-6">My Certificates</h2>
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spin />
        </div>
      ) : certificates.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Award className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No certificates issued yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {certificates.map((certificate) => (
            <div
              key={certificate._id || certificate.cert_id}
              className="bg-card border border-border rounded-2xl p-6 hover:border-primary/20 transition-colors flex items-center gap-5"
            >
              <div
                className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0",
                  certificate.is_revoked ? "bg-muted" : "bg-amber-500/10"
                )}
              >
                <Award
                  className={cn(
                    "w-7 h-7",
                    certificate.is_revoked ? "text-muted-foreground" : "text-amber-500"
                  )}
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate">
                  {certificate.internship_name}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Completion Certificate</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge color={certificate.is_revoked ? "red" : "green"}>
                    {certificate.is_revoked ? "Revoked" : "Issued"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(certificate.created_at)}
                  </span>
                </div>
                <p className="text-xs font-mono text-muted-foreground/60 mt-1">
                  {certificate.cert_id}
                </p>
              </div>
              {!certificate.is_revoked && (
                <div className="flex gap-2">
                  <a
                    href={certificate.download_url || certificate.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => handleCopy(certificate.cert_id)}
                    className="p-2.5 rounded-xl bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                    title="Copy Certificate ID"
                  >
                    {copiedId === certificate.cert_id ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  <a
                    href={certificate.verification_url || certificate.qr_code_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-xl bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                    title="Verify Certificate"
                  >
                    <QrCode className="w-4 h-4" />
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StudentPayments({ payments }: { payments: any[] }) {
  return (
    <div>
      <h2 className="font-display font-bold text-2xl text-foreground mb-6">Payment History</h2>
      {payments.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No payments yet.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {["Transaction ID", "Program", "Amount", "Method", "Date", "Status"].map((h) => (
                  <th
                    key={h}
                    className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr
                  key={p._id || p.razorpay_order_id}
                  className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                >
                  <td className="px-5 py-4 text-xs font-mono text-muted-foreground">
                    {p.razorpay_payment_id || p.razorpay_order_id}
                  </td>
                  <td className="px-5 py-4 text-sm text-foreground">
                    {p.enrollment_id?.internship_id?.category_name || "Internship"}
                  </td>
                  <td className="px-5 py-4 text-sm font-semibold text-foreground">
                    ₹{p.amount.toLocaleString()}
                  </td>
                  <td className="px-5 py-4 text-sm text-muted-foreground">Razorpay</td>
                  <td className="px-5 py-4 text-sm text-muted-foreground">
                    {formatDate(p.paid_at || p.created_at)}
                  </td>
                  <td className="px-5 py-4">
                    <Badge color={statusColor(p.status)}>{p.status || "created"}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StudentProfile({ user }: { user: User }) {
  const { login } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(user.name || "");
  const [collegeName, setCollegeName] = useState(user.college_name || "");
  const [course, setCourse] = useState(user.course || "");
  const [yearOfStudy, setYearOfStudy] = useState(user.year_of_study || 1);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg("");
    setErrorMsg("");
    try {
      const updated = await api.auth.updateProfile({
        full_name: fullName.trim(),
        college_name: collegeName.trim(),
        course: course.trim(),
        year_of_study: Number(yearOfStudy),
      });
      login(updated);
      setIsEditing(false);
      setStatusMsg("Profile updated successfully!");
      setTimeout(() => setStatusMsg(""), 4000);
    } catch (err: any) {
      setErrorMsg(err instanceof ApiError ? err.message : "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFullName(user.name || "");
    setCollegeName(user.college_name || "");
    setCourse(user.course || "");
    setYearOfStudy(user.year_of_study || 1);
    setIsEditing(false);
    setErrorMsg("");
  };

  return (
    <div className="max-w-2xl">
      <h2 className="font-display font-bold text-2xl text-foreground mb-6">My Profile</h2>
      <div className="bg-card border border-border rounded-2xl p-6 mb-4">
        <div className="flex items-center gap-5 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-primary text-white flex items-center justify-center text-2xl font-bold">
            {user.name[0]}
          </div>
          <div>
            <h3 className="font-bold text-xl text-foreground">{user.name}</h3>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <Badge color="violet">Student</Badge>
          </div>
        </div>

        {statusMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" /> {statusMsg}
          </div>
        )}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {errorMsg}
          </div>
        )}

        <div className="h-px bg-border mb-5" />

        {isEditing ? (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground font-medium block mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-input-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium block mb-1.5">
                  Email Address
                </label>
                <input
                  readOnly
                  disabled
                  value={user.email}
                  className="w-full px-3.5 py-2.5 bg-muted/50 border border-border rounded-xl text-sm text-muted-foreground cursor-not-allowed"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium block mb-1.5">
                  Enrollment No.
                </label>
                <input
                  readOnly
                  disabled
                  value={user.enrollment_no || "Not provided"}
                  className="w-full px-3.5 py-2.5 bg-muted/50 border border-border rounded-xl text-sm text-muted-foreground cursor-not-allowed"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium block mb-1.5">
                  College
                </label>
                <input
                  type="text"
                  value={collegeName}
                  onChange={(e) => setCollegeName(e.target.value)}
                  placeholder="e.g. IIT Bombay"
                  className="w-full px-3.5 py-2.5 bg-input-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium block mb-1.5">
                  Course
                </label>
                <input
                  type="text"
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  placeholder="e.g. Computer Science"
                  className="w-full px-3.5 py-2.5 bg-input-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium block mb-1.5">
                  Year of Study
                </label>
                <input
                  type="number"
                  min="1"
                  max="6"
                  value={yearOfStudy}
                  onChange={(e) => setYearOfStudy(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-input-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5 disabled:opacity-50"
              >
                {saving ? (
                  <Spin />
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" /> Save Changes
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2.5 bg-muted text-muted-foreground rounded-xl text-sm font-semibold hover:bg-muted/80 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: "Full Name", value: user.name },
                { label: "Email Address", value: user.email },
                { label: "Enrollment No.", value: user.enrollment_no || "Not provided" },
                { label: "College", value: user.college_name || "Not provided" },
                { label: "Course", value: user.course || "Not provided" },
                {
                  label: "Year of Study",
                  value: user.year_of_study ? `Year ${user.year_of_study}` : "Not provided",
                },
              ].map(({ label, value }) => (
                <div key={label}>
                  <label className="text-xs text-muted-foreground font-medium block mb-1.5">
                    {label}
                  </label>
                  <input
                    readOnly
                    value={value}
                    className="w-full px-3.5 py-2.5 bg-input-background border border-border rounded-xl text-sm text-foreground"
                  />
                </div>
              ))}
            </div>
            <button
              onClick={() => setIsEditing(true)}
              className="mt-5 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5"
            >
              <Edit3 className="w-3.5 h-3.5" /> Edit Profile
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
