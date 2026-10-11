// ── Real API Service Layer ──────────────────────────────────────────────────
// Connects to the Express + MongoDB backend with HttpOnly cookies & CSRF protection.

const BASE_URL = import.meta.env.VITE_API_URL || "/api";

// ── Session helpers (Task 2.5: Token removed from localStorage) ───────────────
const USER_KEY = "internme_user";

export const userStore = {
  get: () => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  set: (user: unknown) => localStorage.setItem(USER_KEY, JSON.stringify(user)),
  clear: () => localStorage.removeItem(USER_KEY),
};

// Deprecated tokenStore stub for backward compatibility (no localStorage storage)
export const tokenStore = {
  get: () => null,
  set: (_token: string) => {},
  clear: () => {},
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function getCsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

interface RequestOptions extends RequestInit {
  _retry?: boolean;
}

async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const csrfToken = getCsrfToken();
  const method = (options.method || "GET").toUpperCase();

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: "include", // Include HttpOnly cookies in all requests
    headers: {
      "Content-Type": "application/json",
      ...(csrfToken && method !== "GET" ? { "X-CSRF-Token": csrfToken } : {}),
      ...(options.headers || {}),
    },
  });

  let body: any = null;
  try {
    body = await res.json();
  } catch {
    // response had no JSON body
  }

  // Handle 401 with automatic token refresh (Task 2.5)
  if (res.status === 401 && !options._retry && path !== "/auth/login" && path !== "/auth/refresh") {
    options._retry = true;
    try {
      const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
        },
      });

      if (refreshRes.ok) {
        // Retry the original request after successful refresh
        return request<T>(path, options);
      }
    } catch {
      // Refresh failed
    }

    userStore.clear();
  }

  if (!res.ok) {
    const message = body?.message || body?.error || `Request failed (${res.status})`;
    throw new ApiError(message, res.status);
  }

  return body as T;
}

const get = <T>(path: string) => request<T>(path, { method: "GET" });
const post = <T>(path: string, data?: unknown) =>
  request<T>(path, { method: "POST", body: data ? JSON.stringify(data) : undefined });
const put = <T>(path: string, data?: unknown) =>
  request<T>(path, { method: "PUT", body: data ? JSON.stringify(data) : undefined });

const unwrap = <T>(body: any): T => (body?.data ?? body) as T;

const normalizeUser = (user: any) => ({
  ...user,
  id: user?.id || user?._id,
  name: user?.name || user?.full_name,
  email: user?.email || user?.college_email,
  enrollmentNo: user?.enrollmentNo || user?.enrollment_no,
  collegeName: user?.collegeName || user?.college_name,
  yearOfStudy: user?.yearOfStudy || user?.year_of_study,
});

const normalizeInternship = (item: any) => ({
  id: item?.id || item?.category_code,
  title: item?.title || item?.category_name,
  code: item?.category_code,
  category: item?.category_name,
  description: item?.description,
  icon: item?.icon || "📘",
  rating: 4.8,
  reviewsCount: 120,
  popular: Boolean(item?.price_1m),
  price1m: item?.price_1m,
  price3m: item?.price_3m,
  price5m: item?.price_5m,
});

// ── API ───────────────────────────────────────────────────────────────────────
export const api = {
  auth: {
    login: async (email: string, password: string) => {
      const body = await post<any>("/auth/login", { college_email: email, password });
      const user = normalizeUser(unwrap<any>(body));
      userStore.set(user);
      return { user, token: undefined };
    },

    register: (data: {
      name: string;
      email: string;
      password: string;
      enrollmentNo: string;
      course?: string;
      collegeName?: string;
      yearOfStudy?: number;
    }) =>
      post<{ message: string }>("/auth/register", {
        full_name: data.name,
        college_email: data.email,
        enrollment_no: data.enrollmentNo,
        password: data.password,
        course: data.course,
        college_name: data.collegeName,
        year_of_study: data.yearOfStudy,
      }),

    verifyEmail: (token: string) =>
      post<{ message: string }>("/auth/verify-email", { token }),

    refreshSession: async () => {
      const body = await post<any>("/auth/refresh");
      const user = normalizeUser(unwrap<any>(body));
      userStore.set(user);
      return user;
    },

    forgotPassword: (email: string) =>
      post<{ message: string }>("/auth/forgot-password", { college_email: email }),

    resetPassword: (data: { token: string; new_password: string }) =>
      post<{ message: string }>("/auth/reset-password", data),

    logout: async () => {
      const result = await post<{ message: string }>("/auth/logout");
      userStore.clear();
      return result;
    },

    me: async () => {
      const body = await get<any>("/auth/me");
      return { user: normalizeUser(unwrap<any>(body)) };
    },

    updateProfile: async (data: {
      full_name?: string;
      college_name?: string;
      course?: string;
      year_of_study?: number;
    }) => {
      const body = await put<any>("/auth/profile", data);
      const user = normalizeUser(unwrap<any>(body));
      userStore.set(user);
      return user;
    },
  },

  internships: {
    getAll: async (params?: { search?: string; category?: string }) => {
      const query = new URLSearchParams();
      if (params?.search) query.set("search", params.search);
      if (params?.category && params.category !== "All") query.set("category", params.category);
      const body = await get<any>(`/internships${query.toString() ? `?${query.toString()}` : ""}`);
      return unwrap<any[]>(body).map(normalizeInternship);
    },
    getById: async (id: string) => {
      const body = await get<any>(`/internships/${id}`);
      return normalizeInternship(unwrap<any>(body));
    },
  },

  enrollment: {
    enroll: async (internshipId: string, pricingTier?: string) => {
      const body = await post<any>("/enroll/create-order", {
        categoryCode: internshipId,
        duration: Number(pricingTier || 1),
      });
      return unwrap<any>(body);
    },
    verifyPayment: async (data: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    }) => {
      const body = await post<any>("/enroll/verify-payment", data);
      return unwrap<any>(body);
    },
    getMyEnrollments: async () => {
      const body = await get<any>("/enroll/my");
      return unwrap<any[]>(body);
    },
  },

  tasks: {
    getAll: async (enrollmentId: string) => {
      const body = await get<any>(`/tasks/${enrollmentId}`);
      return unwrap<any[]>(body);
    },
    submit: async (enrollmentId: string, linkedinUrl: string) => {
      const body = await post<any>(`/tasks/${enrollmentId}/submit`, { linkedin_url: linkedinUrl });
      return unwrap<any>(body);
    },
  },

  certificates: {
    getMyCertificates: async () => {
      const body = await get<any>("/certificates/my");
      return unwrap<any[]>(body);
    },
    verify: (id: string) => get<any>(`/verify/${encodeURIComponent(id)}`),
    download: async (id: string) => {
      const body = await get<any>(`/certificates/${id}/download`);
      return unwrap<{ url: string }>(body);
    },
  },

  admin: {
    getStats: async () => {
      const body = await get<any>("/admin/dashboard");
      const data = unwrap<any>(body);
      return {
        ...data,
        totalStudents: data.totalUsers ?? 0,
        totalInternships: data.totalInternships ?? 0,
        activeEnrollments: data.activeEnrollments ?? 0,
        completionRate: data.completionRate ?? "0%",
      };
    },
    getUsers: async () => {
      const body = await get<any>("/admin/users");
      return unwrap<any[]>(body);
    },
    getSubmissions: async () => {
      const body = await get<any>("/admin/submissions/pending");
      return unwrap<any[]>(body);
    },
    reviewSubmission: (id: string, action: "approve" | "reject", notes?: string) =>
      post(`/admin/submissions/${id}/review`, { action, notes }),
    createInternship: (payload: unknown) => post("/admin/internships", payload),
    updateInternship: (id: string, payload: unknown) => put(`/admin/internships/${id}`, payload),
    getCertificates: async () => {
      const body = await get<any>("/admin/certificates");
      return unwrap<any[]>(body);
    },
    revokeCertificate: (id: string, mfaToken?: string) =>
      post(`/admin/certificates/${id}/revoke`, { mfa_token: mfaToken }),
    getPayments: async () => {
      const body = await get<any>("/admin/payments");
      return unwrap<any>(body);
    },
    refundPayment: (id: string, reason?: string, mfaToken?: string) =>
      post<any>(`/admin/payments/${id}/refund`, { reason, mfa_token: mfaToken }),
    getTestimonials: async () => {
      const body = await get<any>("/admin/testimonials");
      return unwrap<any>(body);
    },
    approveTestimonial: (id: string) => post<any>(`/admin/testimonials/${id}/approve`),
    deleteTestimonial: (id: string) => request<any>(`/admin/testimonials/${id}`, { method: "DELETE" }),
  },

  stats: {
    get: async () => {
      const body = await get<any>("/stats");
      return unwrap<any>(body);
    },
  },

  testimonials: {
    getAll: async () => {
      const body = await get<any>("/testimonials");
      return unwrap<any[]>(body);
    },
    submit: (payload: {
      name: string;
      role: string;
      company?: string;
      rating?: number;
      text: string;
      program?: string;
    }) => post<any>("/testimonials", payload),
  },

  contact: {
    submit: (payload: { name: string; email: string; subject: string; message: string }) =>
      post("/contact", payload),
  },
};