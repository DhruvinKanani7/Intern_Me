import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  GraduationCap, Home, Users, Briefcase, CheckCircle, Award,
  CreditCard, Sun, Moon, LogOut, Menu, Bell, DollarSign,
  Search, AlertCircle, X, MoreHorizontal, FileText, ExternalLink,
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
  const [saving, setSaving] = useState(false);
  const [editingProgram, setEditingProgram] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);
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
  });

  const loadPrograms = () => {
    setLoading(true);
    setError("");
    api.internships
      .getAll()
      .then(setPrograms)
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
      price_1m: "",
      price_3m: "",
      price_5m: "",
      total_tasks_1m: "4",
      total_tasks_3m: "8",
      total_tasks_5m: "14",
    });
    setShowForm(true);
  };

  const openEditForm = (program: any) => {
    setEditingProgram(program);
    setForm({
      category_code: program.category_code || program.id || "",
      category_name: program.category_name || program.title || "",
      description: program.description || "",
      icon: program.icon || "📘",
      price_1m: String(program.price_1m ?? program.price ?? ""),
      price_3m: String(program.price_3m ?? program.originalPrice ?? ""),
      price_5m: String(program.price_5m ?? ""),
      total_tasks_1m: String(program.total_tasks_1m ?? program.projects ?? 4),
      total_tasks_3m: String(program.total_tasks_3m ?? program.modules ?? 8),
      total_tasks_5m: String(program.total_tasks_5m ?? 14),
    });
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
    if (!form.category_code.trim() || !form.category_name.trim() || !form.description.trim()) {
      setError("Program code, name, and description are required.");
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
      is_active: true,
    };

    if (
      [payload.price_1m, payload.price_3m, payload.price_5m].some(
        (value) => Number.isNaN(value) || value < 0
      )
    ) {
      setError("Program prices must be valid non-negative numbers.");
      return;
    }

    setSaving(true);
    try {
      if (editingProgram?._id) {
        await api.admin.updateInternship(editingProgram._id, payload);
      } else {
        await api.admin.createInternship(payload);
      }
      setShowForm(false);
      loadPrograms();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save program.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display font-bold text-2xl text-foreground">Programs</h2>
        <button
          onClick={openCreateForm}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          + Add Program
        </button>
      </div>
      {showForm && (
        <form
          onSubmit={submitProgram}
          className="bg-card border border-border rounded-2xl p-5 mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">
              {editingProgram ? "Edit Program" : "Add Program"}
            </h3>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              aria-label="Close form"
              className="p-2 rounded-lg hover:bg-muted text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              value={form.category_code}
              onChange={updateForm("category_code")}
              placeholder="Code, e.g. AI"
              className="px-3.5 py-2.5 bg-input-background border border-border rounded-xl text-sm text-foreground"
            />
            <input
              value={form.category_name}
              onChange={updateForm("category_name")}
              placeholder="Program name"
              className="px-3.5 py-2.5 bg-input-background border border-border rounded-xl text-sm text-foreground"
            />
            <input
              value={form.icon}
              onChange={updateForm("icon")}
              placeholder="Icon"
              className="px-3.5 py-2.5 bg-input-background border border-border rounded-xl text-sm text-foreground"
            />
            <div className="grid grid-cols-3 gap-2">
              <input
                value={form.price_1m}
                onChange={updateForm("price_1m")}
                placeholder="1m price"
                type="number"
                min="0"
                className="px-3.5 py-2.5 bg-input-background border border-border rounded-xl text-sm text-foreground"
              />
              <input
                value={form.price_3m}
                onChange={updateForm("price_3m")}
                placeholder="3m price"
                type="number"
                min="0"
                className="px-3.5 py-2.5 bg-input-background border border-border rounded-xl text-sm text-foreground"
              />
              <input
                value={form.price_5m}
                onChange={updateForm("price_5m")}
                placeholder="5m price"
                type="number"
                min="0"
                className="px-3.5 py-2.5 bg-input-background border border-border rounded-xl text-sm text-foreground"
              />
            </div>
            <textarea
              value={form.description}
              onChange={updateForm("description")}
              placeholder="Description"
              rows={3}
              className="md:col-span-2 px-3.5 py-2.5 bg-input-background border border-border rounded-xl text-sm text-foreground resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Program"}
            </button>
          </div>
        </form>
      )}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spin />
        </div>
      ) : error ? (
        <div className="text-center py-20 text-red-500">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-60" />
          <p>{error}</p>
        </div>
      ) : programs.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No programs found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {programs.map((i) => (
            <div
              key={i.id}
              className="bg-card border border-border rounded-2xl p-5 flex items-start gap-4 hover:border-primary/20 transition-colors"
            >
              <div className="w-16 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl flex-shrink-0">
                {i.icon || <Briefcase className="w-5 h-5 text-primary" />}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground text-sm truncate">{i.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge color="violet">{i.category}</Badge>
                  <span className="text-xs text-muted-foreground">₹{i.price.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span>
                    <FileText className="w-3 h-3 inline mr-0.5" />
                    {i.modules || 0} tasks
                  </span>
                  <span>
                    <CreditCard className="w-3 h-3 inline mr-0.5" />₹
                    {Number(i.price_3m || 0).toLocaleString()} / 3 mo
                  </span>
                </div>
              </div>
              <button
                onClick={() => openEditForm(i)}
                aria-label="Edit program options"
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          ))}
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
