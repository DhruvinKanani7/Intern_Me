import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  GraduationCap, Home, Users, Briefcase, CheckCircle, Award,
  CreditCard, Sun, Moon, LogOut, Menu, Bell, DollarSign,
  Search, AlertCircle, X, MoreHorizontal, FileText, ExternalLink,
  Edit3, Trash2, RotateCcw, Plus, Check, ShieldAlert, AlertTriangle,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from "recharts";
import { useApp } from "../../context/AppContext";
import { AdminTab } from "../../types";
import { api, ApiError } from "../../lib/api";
import { Badge, formatDate, statusColor, Spin, cn } from "../../lib/helpers";

export default function AdminDashboard() {
  const { user, go, theme, toggleTheme, logout } = useApp();
  const [tab, setTab] = useState<AdminTab>("overview");
  const [stats, setStats] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminNotifOpen, setAdminNotifOpen] = useState(false);

  useEffect(() => {
    if (user?.role !== "admin") return;
    api.admin.getStats().then(setStats).catch(() => setStats(null));
  }, [user]);

  useEffect(() => {
    if (!user) go("login");
    else if (user.role !== "admin") go("student");
  }, [user]);

  if (!user || user.role !== "admin") return null;

  const navItems: { label: string; tab: AdminTab; icon: React.ElementType }[] = [
    { label: "Overview", tab: "overview", icon: Home },
    { label: "Students", tab: "students", icon: Users },
    { label: "Programs", tab: "programs", icon: Briefcase },
    { label: "Task Approvals", tab: "submissions", icon: CheckCircle },
    { label: "Certificates", tab: "certs", icon: Award },
    { label: "Payments", tab: "payments", icon: CreditCard },
  ];

  const sidebar = (
    <div className="flex flex-col h-full py-6">
      <div className="px-5 mb-8">
        <button onClick={() => go("home")} className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <span className="font-display font-bold text-lg text-foreground">
            intern<span className="text-primary">me</span>
          </span>
        </button>
        <div className="mt-2 px-1">
          <Badge color="red">Admin</Badge>
        </div>
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
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <Icon className="w-4.5 h-4.5" /> {label}
          </button>
        ))}
      </div>
      <div className="px-3 border-t border-border pt-4">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition-all mb-1"
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
      <aside className="hidden lg:flex flex-col w-60 border-r border-border bg-sidebar flex-shrink-0 fixed left-0 top-0 bottom-0">
        {sidebar}
      </aside>
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/40 z-30"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 400, damping: 40 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 w-64 bg-sidebar border-r border-border z-40"
            >
              {sidebar}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 lg:ml-60 flex flex-col">
        <header className="sticky top-0 z-20 bg-background/90 backdrop-blur-xl border-b border-border h-16 flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-muted"
              onClick={() => setSidebarOpen(true)}
              aria-label="Toggle admin sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="font-display font-semibold text-foreground text-lg capitalize">
              {navItems.find((n) => n.tab === tab)?.label}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setAdminNotifOpen(!adminNotifOpen)}
                className="p-2 rounded-lg hover:bg-muted text-muted-foreground relative"
                aria-label="Admin alerts"
              >
                <Bell className="w-4.5 h-4.5" />
                {stats?.pendingSubmissions > 0 && (
                  <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </button>
              {adminNotifOpen && (
                <div
                  role="dialog"
                  aria-modal="true"
                  className="absolute right-0 top-12 w-80 bg-card border border-border shadow-xl rounded-2xl p-4 z-50"
                >
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-border">
                    <h4 className="font-semibold text-sm text-foreground">Admin Alerts</h4>
                    <button
                      onClick={() => setAdminNotifOpen(false)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Close
                    </button>
                  </div>
                  <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                    <div className="p-2.5 rounded-xl bg-muted/40 text-xs">
                      <p className="font-semibold text-foreground">Task Submissions</p>
                      <p className="text-muted-foreground mt-0.5">
                        {stats?.pendingSubmissions ?? 0} pending submissions await review
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-muted/40 text-xs">
                      <p className="font-semibold text-foreground">Registered Learners</p>
                      <p className="text-muted-foreground mt-0.5">
                        {stats?.totalStudents ?? stats?.totalUsers ?? 0} active students
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center text-sm font-bold">
              A
            </div>
          </div>
        </header>

        <main className="flex-1 p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {tab === "overview" && <AdminOverview stats={stats} />}
              {tab === "students" && <AdminStudents />}
              {tab === "programs" && <AdminPrograms />}
              {tab === "submissions" && <AdminSubmissions />}
              {tab === "certs" && <AdminCerts />}
              {tab === "payments" && <AdminPmts />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

function AdminOverview({ stats }: { stats: any }) {
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([api.admin.getPayments(), api.admin.getUsers()])
      .then(([paymentData, usersData]) => {
        const rows = new Map<string, { m: string; revenue: number; students: number }>();
        const ensureRow = (value: string | Date) => {
          const date = new Date(value);
          if (Number.isNaN(date.getTime())) return null;
          const key = `${date.getFullYear()}-${date.getMonth()}`;
          if (!rows.has(key)) {
            rows.set(key, {
              m: date.toLocaleDateString("en-IN", { month: "short" }),
              revenue: 0,
              students: 0,
            });
          }
          return rows.get(key)!;
        };

        const paymentList = Array.isArray(paymentData)
          ? paymentData
          : paymentData?.payments || [];
        paymentList.forEach((payment: any) => {
          const row = ensureRow(payment.paid_at || payment.created_at);
          if (row && payment.status === "paid") row.revenue += Number(payment.amount || 0);
        });

        const userList = Array.isArray(usersData) ? usersData : usersData?.users || [];
        userList.forEach((userItem: any) => {
          const row = ensureRow(userItem.created_at);
          if (row) row.students += 1;
        });

        setChartData(Array.from(rows.values()).slice(-7));
      })
      .catch(() => setChartData([]));
  }, []);

  const cards = stats
    ? [
        {
          label: "Total Students",
          value: stats.totalStudents.toLocaleString(),
          icon: Users,
          trend: "Live",
          color: "text-violet-500",
          bg: "bg-violet-500/10",
        },
        {
          label: "Total Programs",
          value: stats.totalInternships,
          icon: Briefcase,
          trend: "Live",
          color: "text-blue-500",
          bg: "bg-blue-500/10",
        },
        {
          label: "Total Revenue",
          value: `₹${Number(stats.totalRevenue || 0).toLocaleString()}`,
          icon: DollarSign,
          trend: "Paid",
          color: "text-emerald-500",
          bg: "bg-emerald-500/10",
        },
        {
          label: "Pending Certs",
          value: stats.pendingCerts,
          icon: Award,
          trend: "Need review",
          color: "text-amber-500",
          bg: "bg-amber-500/10",
        },
      ]
    : [];

  return (
    <div>
      {!stats ? (
        <div className="flex items-center justify-center py-20">
          <Spin />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {cards.map(({ label, value, icon: Icon, trend, color, bg }) => (
              <div
                key={label}
                className="bg-card border border-border rounded-2xl p-5 hover:border-primary/20 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", bg)}>
                    <Icon className={cn("w-5 h-5", color)} />
                  </div>
                  <span className="text-xs text-emerald-500 font-semibold bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">
                    {trend}
                  </span>
                </div>
                <p className="font-display font-extrabold text-2xl text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Revenue Chart */}
          <div className="bg-card border border-border rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold text-foreground">Revenue Overview</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Monthly revenue and new students
                </p>
              </div>
              <Badge color="green">Live data</Badge>
            </div>
            {chartData.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                No revenue data yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#5b5cf6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#5b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="m"
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                    formatter={(v: number) => [`₹${v.toLocaleString()}`, "Revenue"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#5b5cf6"
                    strokeWidth={2}
                    fill="url(#revGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Students bar chart */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="font-semibold text-foreground mb-6">New Enrollments by Month</h3>
            {chartData.length === 0 ? (
              <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">
                No enrollment data yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="m"
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="students" fill="#7c3aed" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function AdminStudents() {
  const [search, setSearch] = useState("");
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    api.admin
      .getUsers({ search })
      .then((data: any) => setStudents(Array.isArray(data) ? data : data?.users || []))
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Couldn't load students.")
      )
      .finally(() => setLoading(false));
  }, [search]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display font-bold text-2xl text-foreground">All Students</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search students..."
            className="pl-9 pr-4 py-2 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground w-48"
          />
        </div>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spin />
        </div>
      ) : error ? (
        <div className="text-center py-20 text-red-500">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-60" />
          <p>{error}</p>
        </div>
      ) : students.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No students found.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {["Student", "Enrollment No.", "College", "Joined", "Status"].map((h) => (
                  <th
                    key={h}
                    className="text-left px-5 py-4 text-xs font-semibold text-muted-foreground"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr
                  key={s._id || s.college_email}
                  className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {(s.full_name || "S")[0]}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{s.full_name}</p>
                        <p className="text-xs text-muted-foreground">{s.college_email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-muted-foreground">
                    {s.enrollment_no || "Not provided"}
                  </td>
                  <td className="px-5 py-4 text-sm text-muted-foreground max-w-[180px] truncate">
                    {s.college_name || "Not provided"}
                  </td>
                  <td className="px-5 py-4 text-sm text-muted-foreground">
                    {formatDate(s.created_at)}
                  </td>
                  <td className="px-5 py-4">
                    <Badge color={s.email_verified ? "green" : "amber"}>
                      {s.email_verified ? "Verified" : "Pending"}
                    </Badge>
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

function AdminPrograms() {
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [hardDeleting, setHardDeleting] = useState(false);
  const [editingProgram, setEditingProgram] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [hardDeleteTarget, setHardDeleteTarget] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "deleted">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [form, setForm] = useState({
    category_code: "",
    category_name: "",
    description: "",
    icon: "📘",
    price_1m: "",
    price_3m: "",
    price_5m: "",
    total_tasks_1m: "4",
    total_tasks_3m: "8",
    total_tasks_5m: "14",
    is_active: true,
  });

  const loadPrograms = () => {
    setLoading(true);
    setError("");
    api.admin
      .getInternships()
      .then((data) => setPrograms(Array.isArray(data) ? data : []))
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Couldn't load programs.")
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPrograms();
  }, []);

  const openCreateForm = () => {
    setEditingProgram(null);
    setForm({
      category_code: "",
      category_name: "",
      description: "",
      icon: "📘",
      price_1m: "899",
      price_3m: "1499",
      price_5m: "2199",
      total_tasks_1m: "4",
      total_tasks_3m: "8",
      total_tasks_5m: "14",
      is_active: true,
    });
    setError("");
    setSuccessMsg("");
    setShowForm(true);
  };

  const openEditForm = (program: any) => {
    setEditingProgram(program);
    setForm({
      category_code: program.category_code || program.code || program.id || "",
      category_name: program.category_name || program.title || "",
      description: program.description || "",
      icon: program.icon || "📘",
      price_1m: String(program.price_1m ?? program.price ?? ""),
      price_3m: String(program.price_3m ?? program.originalPrice ?? ""),
      price_5m: String(program.price_5m ?? ""),
      total_tasks_1m: String(program.total_tasks_1m ?? program.projects ?? 4),
      total_tasks_3m: String(program.total_tasks_3m ?? program.modules ?? 8),
      total_tasks_5m: String(program.total_tasks_5m ?? 14),
      is_active: program.is_active !== undefined ? program.is_active : true,
    });
    setError("");
    setSuccessMsg("");
    setShowForm(true);
  };

  const updateForm =
    (key: keyof typeof form) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((current) => ({ ...current, [key]: event.target.value }));
    };

  const submitProgram = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!form.category_code.trim() || !form.category_name.trim() || !form.description.trim()) {
      setError("Course code, course name, and description are required.");
      return;
    }

    const payload = {
      category_code: form.category_code.trim().toUpperCase(),
      category_name: form.category_name.trim(),
      description: form.description.trim(),
      icon: form.icon.trim() || "📘",
      price_1m: Number(form.price_1m),
      price_3m: Number(form.price_3m),
      price_5m: Number(form.price_5m),
      total_tasks_1m: Number(form.total_tasks_1m),
      total_tasks_3m: Number(form.total_tasks_3m),
      total_tasks_5m: Number(form.total_tasks_5m),
      is_active: Boolean(form.is_active),
    };

    if (
      [payload.price_1m, payload.price_3m, payload.price_5m].some(
        (value) => Number.isNaN(value) || value < 0
      )
    ) {
      setError("Course prices must be valid non-negative numbers.");
      return;
    }

    setSaving(true);
    try {
      const targetId = editingProgram?._id || editingProgram?.id || editingProgram?.category_code;
      if (editingProgram && targetId) {
        await api.admin.updateInternship(targetId, payload);
        setSuccessMsg(`Course "${payload.category_name}" updated successfully.`);
      } else {
        await api.admin.createInternship(payload);
        setSuccessMsg(`Course "${payload.category_name}" created successfully.`);
      }
      setShowForm(false);
      loadPrograms();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save course.");
    } finally {
      setSaving(false);
    }
  };

  const handleSoftDelete = async (program: any) => {
    setDeleting(true);
    setError("");
    try {
      const targetId = program._id || program.id || program.category_code;
      await api.admin.deleteInternship(targetId);
      setDeleteTarget(null);
      setSuccessMsg(`Course "${program.title || program.category_name}" soft-deleted successfully.`);
      loadPrograms();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't delete course.");
    } finally {
      setDeleting(false);
    }
  };

  const handleRestore = async (program: any) => {
    setError("");
    try {
      const targetId = program._id || program.id || program.category_code;
      await api.admin.restoreInternship(targetId);
      setSuccessMsg(`Course "${program.title || program.category_name}" restored successfully.`);
      loadPrograms();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't restore course.");
    }
  };

  const handleHardDelete = async (program: any) => {
    setHardDeleting(true);
    setError("");
    try {
      const targetId = program._id || program.id || program.category_code;
      await api.admin.hardDeleteInternship(targetId);
      setHardDeleteTarget(null);
      setSuccessMsg(`Course "${program.title || program.category_name}" permanently deleted from database.`);
      loadPrograms();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't permanently delete course.");
    } finally {
      setHardDeleting(false);
    }
  };

  const activePrograms = programs.filter((p) => p.is_active !== false);
  const deletedPrograms = programs.filter((p) => p.is_active === false);

  const filteredPrograms = programs.filter((p) => {
    const matchesStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "active"
        ? p.is_active !== false
        : p.is_active === false;

    const matchesSearch =
      !searchQuery ||
      (p.title || p.category_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.code || p.category_code || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.category || "").toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="font-display font-bold text-2xl text-foreground">Course Programs</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage course offerings, pricing tiers, task counts, and soft deletion.
          </p>
        </div>
        <button
          onClick={openCreateForm}
          className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5 self-start sm:self-auto shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add Course
        </button>
      </div>

      {/* Status feedback alerts */}
      {successMsg && (
        <div className="mb-4 flex items-center justify-between p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-600 dark:text-emerald-400 text-sm">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg("")} className="hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="mb-4 flex items-center justify-between p-3.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError("")} className="hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter tabs and search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2 border-b md:border-b-0 border-border pb-2 md:pb-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5",
              statusFilter === "all"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <span>All Courses</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/15 dark:bg-white/15">
              {programs.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("active")}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5",
              statusFilter === "active"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <span>Active</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/15 dark:bg-white/15">
              {activePrograms.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("deleted")}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5",
              statusFilter === "deleted"
                ? "bg-red-500 text-white shadow-sm"
                : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <span>Soft Deleted</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/15 dark:bg-white/15">
              {deletedPrograms.length}
            </span>
          </button>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search code or title..."
            className="w-full pl-9 pr-3 py-1.5 bg-card border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      {/* Edit / Add Course Modal / Form */}
      {showForm && (
        <form
          onSubmit={submitProgram}
          className="bg-card border border-border rounded-2xl p-6 mb-6 shadow-xl"
        >
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-border">
            <div>
              <h3 className="font-bold text-foreground text-base">
                {editingProgram ? "Edit Course" : "Add New Course"}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {editingProgram
                  ? `Updating course ${editingProgram.category_code || editingProgram.code}`
                  : "Create a new course offering for the platform."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              aria-label="Close form"
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                Course Code (Unique identifier)
              </label>
              <input
                value={form.category_code}
                onChange={updateForm("category_code")}
                placeholder="e.g. FULLSTACK, AI, UIUX"
                disabled={Boolean(editingProgram)}
                className="w-full px-3.5 py-2.5 bg-input-background border border-border rounded-xl text-sm text-foreground disabled:opacity-60 disabled:cursor-not-allowed font-mono uppercase"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                Course Name / Title
              </label>
              <input
                value={form.category_name}
                onChange={updateForm("category_name")}
                placeholder="e.g. Full Stack Web Development"
                className="w-full px-3.5 py-2.5 bg-input-background border border-border rounded-xl text-sm text-foreground"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                Icon (Emoji or symbol)
              </label>
              <input
                value={form.icon}
                onChange={updateForm("icon")}
                placeholder="📘 or 💻 or 🎨"
                className="w-full px-3.5 py-2.5 bg-input-background border border-border rounded-xl text-sm text-foreground"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                Course Status
              </label>
              <label className="flex items-center gap-2.5 px-3.5 py-2.5 bg-muted/30 border border-border rounded-xl cursor-pointer hover:bg-muted/50 transition-colors">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((c) => ({ ...c, is_active: e.target.checked }))}
                  className="rounded border-border text-primary focus:ring-primary w-4 h-4"
                />
                <span className="text-xs font-medium text-foreground">
                  Active (visible in public catalog and open for enrollment)
                </span>
              </label>
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                Pricing Tiers (₹ INR)
              </label>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <span className="text-[11px] text-muted-foreground block mb-1">1 Month Price</span>
                  <input
                    value={form.price_1m}
                    onChange={updateForm("price_1m")}
                    placeholder="899"
                    type="number"
                    min="0"
                    className="w-full px-3.5 py-2.5 bg-input-background border border-border rounded-xl text-sm text-foreground"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block mb-1">3 Month Price</span>
                  <input
                    value={form.price_3m}
                    onChange={updateForm("price_3m")}
                    placeholder="1499"
                    type="number"
                    min="0"
                    className="w-full px-3.5 py-2.5 bg-input-background border border-border rounded-xl text-sm text-foreground"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block mb-1">5 Month Price</span>
                  <input
                    value={form.price_5m}
                    onChange={updateForm("price_5m")}
                    placeholder="2199"
                    type="number"
                    min="0"
                    className="w-full px-3.5 py-2.5 bg-input-background border border-border rounded-xl text-sm text-foreground"
                  />
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                Total Tasks Required
              </label>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <span className="text-[11px] text-muted-foreground block mb-1">1 Month Tasks</span>
                  <input
                    value={form.total_tasks_1m}
                    onChange={updateForm("total_tasks_1m")}
                    placeholder="4"
                    type="number"
                    min="1"
                    className="w-full px-3.5 py-2.5 bg-input-background border border-border rounded-xl text-sm text-foreground"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block mb-1">3 Month Tasks</span>
                  <input
                    value={form.total_tasks_3m}
                    onChange={updateForm("total_tasks_3m")}
                    placeholder="8"
                    type="number"
                    min="1"
                    className="w-full px-3.5 py-2.5 bg-input-background border border-border rounded-xl text-sm text-foreground"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block mb-1">5 Month Tasks</span>
                  <input
                    value={form.total_tasks_5m}
                    onChange={updateForm("total_tasks_5m")}
                    placeholder="14"
                    type="number"
                    min="1"
                    className="w-full px-3.5 py-2.5 bg-input-background border border-border rounded-xl text-sm text-foreground"
                  />
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                Course Description
              </label>
              <textarea
                value={form.description}
                onChange={updateForm("description")}
                placeholder="Detailed curriculum overview, skills gained, and project goals..."
                rows={3}
                className="w-full px-3.5 py-2.5 bg-input-background border border-border rounded-xl text-sm text-foreground resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-5 pt-3 border-t border-border">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-all flex items-center gap-1.5"
            >
              {saving ? (
                <>
                  <Spin /> Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {editingProgram ? "Update Course" : "Save Course"}
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Delete Confirmation Modal (Soft Delete) */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setDeleteTarget(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16 }}
              className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 flex-shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-base">Soft Delete Course?</h3>
                  <p className="text-xs text-muted-foreground">Safe deletion with zero data loss</p>
                </div>
              </div>

              <div className="p-3 bg-muted/40 rounded-xl mb-4 text-xs space-y-2 text-foreground">
                <p>
                  Are you sure you want to soft delete{" "}
                  <strong className="text-foreground font-semibold">
                    {deleteTarget.title || deleteTarget.category_name}
                  </strong>{" "}
                  (<span className="font-mono">{deleteTarget.code || deleteTarget.category_code}</span>)?
                </p>
                <p className="text-muted-foreground">
                  • The course will be <strong>hidden</strong> from the public catalog.
                  <br />
                  • <strong>Existing student enrollments, task submissions, and certificates remain 100% safe.</strong>
                  <br />
                  • You can restore this course at any time from this dashboard.
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 border border-border rounded-xl text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSoftDelete(deleteTarget)}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm shadow-red-600/20"
                >
                  {deleting ? (
                    <>
                      <Spin /> Soft Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" /> Confirm Soft Delete
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hard Delete Confirmation Modal */}
      <AnimatePresence>
        {hardDeleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setHardDeleteTarget(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16 }}
              className="bg-card border border-red-500/40 rounded-2xl p-6 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-600/15 flex items-center justify-center text-red-600 flex-shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-base">Permanently Delete Course?</h3>
                  <p className="text-xs text-red-500 font-semibold">Irreversible Hard Delete</p>
                </div>
              </div>

              <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl mb-4 text-xs space-y-2 text-foreground">
                <p>
                  You are about to permanently purge{" "}
                  <strong className="text-foreground font-semibold">
                    {hardDeleteTarget.title || hardDeleteTarget.category_name}
                  </strong>{" "}
                  (<span className="font-mono">{hardDeleteTarget.code || hardDeleteTarget.category_code}</span>) from the database.
                </p>
                <p className="text-red-600 dark:text-red-400 font-medium">
                  ⚠️ This action cannot be reversed. The course record, syllabus tasks, and metadata will be permanently eliminated.
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setHardDeleteTarget(null)}
                  className="px-4 py-2 border border-border rounded-xl text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleHardDelete(hardDeleteTarget)}
                  disabled={hardDeleting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-red-600/30"
                >
                  {hardDeleting ? (
                    <>
                      <Spin /> Hard Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" /> Permanently Delete
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Program Cards Listing */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spin />
        </div>
      ) : filteredPrograms.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground bg-card border border-border rounded-2xl p-8">
          <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-semibold text-foreground mb-1">No courses found</p>
          <p className="text-xs text-muted-foreground">
            {statusFilter !== "all" || searchQuery
              ? "Try adjusting your search query or status filter."
              : "Click '+ Add Course' to create your first course offering."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPrograms.map((i) => {
            const isSoftDeleted = i.is_active === false;
            return (
              <div
                key={i.id || i._id}
                className={cn(
                  "bg-card border rounded-2xl p-5 flex flex-col justify-between transition-all",
                  isSoftDeleted
                    ? "border-red-500/30 bg-red-500/[0.02]"
                    : "border-border hover:border-primary/30"
                )}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl flex-shrink-0">
                        {i.icon || "📘"}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold text-foreground text-sm truncate">
                            {i.title || i.category_name}
                          </h3>
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                            {i.code || i.category_code}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge color="violet">{i.category || i.category_name}</Badge>
                          {isSoftDeleted ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-500/15 text-red-500 border border-red-500/30">
                              Soft Deleted
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                              Active
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
                    {i.description}
                  </p>

                  <div className="grid grid-cols-3 gap-2 bg-muted/40 p-2.5 rounded-xl mb-4 text-xs">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">1 Month</span>
                      <span className="font-bold text-foreground">₹{Number(i.price_1m || i.price || 0).toLocaleString()}</span>
                      <span className="text-[10px] text-muted-foreground block mt-0.5">{i.total_tasks_1m || 4} tasks</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">3 Months</span>
                      <span className="font-bold text-foreground">₹{Number(i.price_3m || 0).toLocaleString()}</span>
                      <span className="text-[10px] text-muted-foreground block mt-0.5">{i.total_tasks_3m || 8} tasks</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">5 Months</span>
                      <span className="font-bold text-foreground">₹{Number(i.price_5m || 0).toLocaleString()}</span>
                      <span className="text-[10px] text-muted-foreground block mt-0.5">{i.total_tasks_5m || 14} tasks</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border/80 gap-2">
                  <div className="text-[11px] text-muted-foreground">
                    {isSoftDeleted ? (
                      <span className="text-red-500 font-medium">Hidden from catalog</span>
                    ) : (
                      <span>Visible to students</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEditForm(i)}
                      className="px-3 py-1.5 bg-muted/70 hover:bg-muted text-foreground rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-border/60"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    {isSoftDeleted ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleRestore(i)}
                          className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Restore</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setHardDeleteTarget(i)}
                          className="px-3 py-1.5 bg-red-600/10 hover:bg-red-600 text-red-600 hover:text-white border border-red-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                          title="Permanently remove course from database"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hard Delete</span>
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(i)}
                        className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AdminSubmissions() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");

  const loadSubmissions = () => {
    setLoading(true);
    setError("");
    api.admin
      .getSubmissions()
      .then((data: any) =>
        setSubmissions(Array.isArray(data) ? data : data?.submissions || [])
      )
      .catch((err) =>
        setError(
          err instanceof ApiError ? err.message : "Couldn't load pending submissions."
        )
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSubmissions();
  }, []);

  const handleApprove = async (id: string) => {
    setBusyId(id);
    try {
      await api.admin.reviewSubmission(id, "approve");
      loadSubmissions();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't approve submission.");
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (id: string) => {
    setBusyId(id);
    try {
      await api.admin.reviewSubmission(id, "reject", rejectNotes.trim() || undefined);
      setRejectingId(null);
      setRejectNotes("");
      loadSubmissions();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't reject submission.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <h2 className="font-display font-bold text-2xl text-foreground mb-6">Task Approvals</h2>
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spin />
        </div>
      ) : error ? (
        <div className="text-center py-20 text-red-500">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-60" />
          <p>{error}</p>
        </div>
      ) : submissions.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No pending submissions. All caught up.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {submissions.map((submission) => {
            const enrollment = submission.enrollment_id || {};
            const student = enrollment.user_id || {};
            const internship = enrollment.internship_id || {};
            const isBusy = busyId === submission._id;
            return (
              <div key={submission._id} className="bg-card border border-border rounded-2xl p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm">
                      {student.full_name || "Unknown student"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {internship.category_name || "Internship"} · {enrollment.internship_code} ·
                      Task {submission.task_number}
                    </p>
                    <a
                      href={submission.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                    >
                      View LinkedIn submission <ExternalLink className="w-3 h-3" />
                    </a>
                    <p className="text-xs text-muted-foreground mt-1">
                      Submitted: {formatDate(submission.submitted_at)}
                    </p>
                  </div>
                  <Badge color="amber">Pending Review</Badge>
                </div>

                {rejectingId === submission._id ? (
                  <div className="mt-4 flex flex-col gap-2">
                    <textarea
                      value={rejectNotes}
                      onChange={(e) => setRejectNotes(e.target.value)}
                      placeholder="Reason for rejection (sent to the student)"
                      className="w-full bg-input-background border border-border rounded-lg px-3 py-2 text-sm text-foreground resize-none"
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <button
                        disabled={isBusy}
                        onClick={() => handleReject(submission._id)}
                        className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-semibold hover:bg-red-600 transition-colors disabled:opacity-50"
                      >
                        {isBusy ? "Rejecting…" : "Confirm Reject"}
                      </button>
                      <button
                        disabled={isBusy}
                        onClick={() => {
                          setRejectingId(null);
                          setRejectNotes("");
                        }}
                        className="px-3 py-1.5 border border-border rounded-lg text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2 mt-4">
                    <button
                      disabled={isBusy}
                      onClick={() => handleApprove(submission._id)}
                      className="px-3 py-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-semibold hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                    >
                      {isBusy ? "Approving…" : "Approve"}
                    </button>
                    <button
                      disabled={isBusy}
                      onClick={() => setRejectingId(submission._id)}
                      className="px-3 py-1.5 bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg text-xs font-semibold hover:bg-red-500/20 transition-colors disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AdminCerts() {
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadCertificates = () => {
    setLoading(true);
    setError("");
    api.admin
      .getCertificates()
      .then((data: any) =>
        setCertificates(Array.isArray(data) ? data : data?.certificates || [])
      )
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Couldn't load certificates.")
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCertificates();
  }, []);

  const handleRevoke = async (id: string) => {
    await api.admin.revokeCertificate(id);
    loadCertificates();
  };

  return (
    <div>
      <h2 className="font-display font-bold text-2xl text-foreground mb-6">Certificates</h2>
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spin />
        </div>
      ) : error ? (
        <div className="text-center py-20 text-red-500">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-60" />
          <p>{error}</p>
        </div>
      ) : certificates.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Award className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No certificates found.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {certificates.map((certificate) => {
            const enrollment = certificate.enrollment_id || {};
            const student = enrollment.user_id || {};
            const internship = enrollment.internship_id || {};
            return (
              <div
                key={certificate._id}
                className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <Award className="w-5 h-5 text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm">
                    {student.full_name || certificate.full_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {internship.category_name || certificate.internship_name} ·{" "}
                    {certificate.cert_id}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Issued: {formatDate(certificate.created_at)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge color={certificate.is_revoked ? "red" : "green"}>
                    {certificate.is_revoked ? "Revoked" : "Active"}
                  </Badge>
                  {!certificate.is_revoked && (
                    <button
                      onClick={() => handleRevoke(certificate._id)}
                      className="px-3 py-1.5 bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg text-xs font-semibold hover:bg-red-500/20 transition-colors"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AdminPmts() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refundModal, setRefundModal] = useState<any>(null);
  const [refundReason, setRefundReason] = useState("");
  const [refundMfaToken, setRefundMfaToken] = useState("");
  const [refunding, setRefunding] = useState(false);
  const [refundError, setRefundError] = useState("");

  const loadPayments = () => {
    setLoading(true);
    setError("");
    api.admin
      .getPayments()
      .then((data: any) =>
        setPayments(Array.isArray(data) ? data : data?.payments || [])
      )
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Couldn't load payments.")
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const handleRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundModal) return;
    setRefunding(true);
    setRefundError("");
    try {
      await api.admin.refundPayment(refundModal._id, refundReason, refundMfaToken);
      setRefundModal(null);
      setRefundReason("");
      setRefundMfaToken("");
      loadPayments();
    } catch (err: any) {
      setRefundError(err instanceof ApiError ? err.message : "Refund failed");
    } finally {
      setRefunding(false);
    }
  };

  return (
    <div>
      <h2 className="font-display font-bold text-2xl text-foreground mb-6">Payments</h2>
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spin />
        </div>
      ) : error ? (
        <div className="text-center py-20 text-red-500">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-60" />
          <p>{error}</p>
        </div>
      ) : payments.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No payments found.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {["ID", "Student", "Program", "Amount", "Method", "Date", "Status", "Action"].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left px-5 py-4 text-xs font-semibold text-muted-foreground"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => {
                const enrollment = payment.enrollment_id || {};
                const student = enrollment.user_id || {};
                const internship = enrollment.internship_id || {};
                return (
                  <tr
                    key={payment._id || payment.razorpay_order_id}
                    className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-5 py-4 text-xs font-mono text-muted-foreground">
                      {payment.razorpay_payment_id || payment.razorpay_order_id}
                    </td>
                    <td className="px-5 py-4 text-sm text-foreground">
                      {student.full_name || "Unknown"}
                    </td>
                    <td className="px-5 py-4 text-sm text-muted-foreground max-w-[140px] truncate">
                      {internship.category_name || "Internship"}
                    </td>
                    <td className="px-5 py-4 text-sm font-bold text-foreground">
                      ₹{Number(payment.amount || 0).toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">Razorpay</td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">
                      {formatDate(payment.paid_at || payment.created_at)}
                    </td>
                    <td className="px-5 py-4">
                      <Badge color={statusColor(payment.status)}>
                        {payment.status || "created"}
                      </Badge>
                    </td>
                    <td className="px-5 py-4">
                      {payment.status === "paid" ? (
                        <button
                          onClick={() => {
                            setRefundModal(payment);
                            setRefundReason("");
                            setRefundMfaToken("");
                            setRefundError("");
                          }}
                          className="px-3 py-1.5 bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg text-xs font-semibold hover:bg-red-500/20 transition-colors"
                        >
                          Refund
                        </button>
                      ) : payment.status === "refunded" ? (
                        <span className="text-xs text-muted-foreground">Refunded</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Admin Refund Modal with Step-Up MFA */}
      <AnimatePresence>
        {refundModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              role="dialog"
              aria-modal="true"
              className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-red-500" /> Process Refund
                </h3>
                <button
                  onClick={() => setRefundModal(null)}
                  aria-label="Close refund dialog"
                  className="p-1 rounded-lg hover:bg-muted text-muted-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-muted/40 rounded-xl p-3 mb-4 text-xs space-y-1">
                <p>
                  <strong className="text-foreground">Student:</strong>{" "}
                  {refundModal.enrollment_id?.user_id?.full_name || "Unknown"}
                </p>
                <p>
                  <strong className="text-foreground">Amount:</strong> ₹
                  {Number(refundModal.amount || 0).toLocaleString()}
                </p>
                <p>
                  <strong className="text-foreground">Order:</strong>{" "}
                  <span className="font-mono">{refundModal.razorpay_order_id}</span>
                </p>
              </div>

              {refundError && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {refundError}
                </div>
              )}

              <form onSubmit={handleRefund} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                    Reason for Refund
                  </label>
                  <input
                    type="text"
                    required
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    placeholder="e.g. 7-day money-back guarantee request"
                    className="w-full px-3.5 py-2.5 bg-input-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-red-500/30"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                    Admin MFA Code (Step-Up)
                  </label>
                  <input
                    type="text"
                    required
                    value={refundMfaToken}
                    onChange={(e) => setRefundMfaToken(e.target.value)}
                    placeholder="6-digit TOTP code or backup code"
                    className="w-full px-3.5 py-2.5 bg-input-background border border-border rounded-xl text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-red-500/30"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    High-privilege operation protected by SEC-15 admin MFA.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setRefundModal(null)}
                    className="flex-1 py-2.5 bg-muted text-muted-foreground rounded-xl text-sm font-semibold hover:bg-muted/80 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={refunding}
                    className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {refunding ? <Spin /> : "Confirm Refund"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
