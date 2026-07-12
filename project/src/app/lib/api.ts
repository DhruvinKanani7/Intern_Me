// ── Real API Service Layer ──────────────────────────────────────────────────
// Connects to the Express + MongoDB backend.

const BASE_URL = import.meta.env.VITE_API_URL || "/api";

// ── Session helpers ──────────────────────────────────────────────────────────
const TOKEN_KEY = "internme_token";
const USER_KEY = "internme_user";

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export const userStore = {
  get: () => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  set: (user: unknown) => localStorage.setItem(USER_KEY, JSON.stringify(user)),
  clear: () => localStorage.removeItem(USER_KEY),
};

// ── Core request helper ──────────────────────────────────────────────────────
class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = tokenStore.get();

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  let body: any = null;
  try {
    body = await res.json();
  } catch {
    // response had no JSON body
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
});

const normalizeInternship = (internship: any) => ({
  ...internship,
  id: internship?.category_code || internship?._id,
  title: internship?.category_name,
  category: internship?.category_name,
  duration: "1, 3, or 5 months",
  price: internship?.price_1m,
  originalPrice: internship?.price_3m,
  level: "Self-paced",
  enrolled: internship?.enrolled || 0,
  rating: internship?.rating || 4.8,
  reviews: internship?.reviews || 0,
  modules: internship?.total_tasks_3m,
  projects: internship?.total_tasks_1m,
  skills: internship?.skills || [],
  image:
    internship?.image ||
    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&h=380&fit=crop&auto=format",
});

// ── API ───────────────────────────────────────────────────────────────────────
export const api = {
  auth: {
    login: async (email: string, password: string) => {
      const body = await post<any>("/auth/login", { college_email: email, password });
      const token = (body as any)?.token;
      if (token) tokenStore.set(token);
      return { user: normalizeUser(unwrap<any>(body)), token: undefined };
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

    logout: async () => {
      const result = await post<{ message: string }>("/auth/logout");
      tokenStore.clear();
      userStore.clear();
      return result;
    },

    me: async () => {
      const body = await get<any>("/auth/me");
      return { user: normalizeUser(unwrap<any>(body)) };
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
        pendingCerts: data.pendingSubmissions ?? 0,
      };
    },
    getUsers: async (params?: { search?: string }) => {
      const query = new URLSearchParams();
      if (params?.search) query.set("search", params.search);
      const body = await get<any>(`/admin/users${query.toString() ? `?${query.toString()}` : ""}`);
      return unwrap<any>(body);
    },
    getEnrollments: async () => {
      const body = await get<any>("/admin/enrollments");
      return unwrap<any>(body);
    },
    getPendingSubmissions: async () => {
      const body = await get<any>("/admin/submissions/pending");
      return unwrap<any[]>(body);
    },
    reviewSubmission: async (id: string, action: "approve" | "reject", notes?: string) => {
      const body = await post<any>(`/admin/submissions/${id}/review`, { action, notes });
      return unwrap<any>(body);
    },
    getPayments: async () => {
      const body = await get<any>("/admin/payments");
      return unwrap<any>(body);
    },
    getCertificates: async () => {
      const body = await get<any>("/admin/certificates");
      return unwrap<any>(body);
    },
    createInternship: (data: any) => post<any>("/admin/internships", data),
    updateInternship: (id: string, data: any) => put<any>(`/admin/internships/${id}`, data),
    revokeCertificate: (id: string) => post<any>(`/admin/certificates/${id}/revoke`),
  },

  payments: {
    getMyPayments: async () => {
      const body = await get<any>("/payments/my");
      return unwrap<any[]>(body);
    },
  },

  contact: {
    send: (data: { name: string; email: string; subject: string; message: string }) =>
      post<{ message: string }>("/contact", data),
  },
};

export { ApiError };

//why this is not working