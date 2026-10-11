import React from "react";

export type Page =
  | "home" | "internships" | "detail" | "login" | "register"
  | "student" | "admin" | "verify" | "about" | "contact" | "pricing"
  | "forgot-password" | "reset-password";

export type StudentTab = "overview" | "internships" | "assignments" | "certs" | "payments" | "profile";
export type AdminTab = "overview" | "students" | "programs" | "submissions" | "certs" | "payments";

export interface User {
  id: string;
  name: string;
  email: string;
  role: "student" | "admin";
  enrollment_no?: string;
  college_name?: string;
  course?: string;
  year_of_study?: number;
}

export interface Internship {
  id: string;
  title: string;
  category: string;
  duration: string;
  price: number;
  originalPrice?: number;
  level: string;
  enrolled: number;
  rating: number;
  reviews: number;
  description: string;
  skills: string[];
  image: string;
  badge?: string;
  modules?: number;
  projects?: number;
  price_1m?: number;
  price_3m?: number;
  price_5m?: number;
}

export interface Testimonial {
  name: string;
  role: string;
  rating: number;
  text: string;
  avatar: string;
  program: string;
}

export interface FAQ {
  q: string;
  a: string;
}

export interface AppCtx {
  theme: "light" | "dark";
  toggleTheme: () => void;
  page: Page;
  go: (p: Page, data?: { id?: string }) => void;
  user: User | null;
  login: (u: User, token?: string) => void;
  logout: () => void;
  selectedId: string | null;
}
