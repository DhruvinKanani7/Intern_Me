import { Testimonial, FAQ } from "../types";

export const TESTIMONIALS: Testimonial[] = [
  {
    name: "Priya Sharma",
    role: "Frontend Developer at TCS",
    rating: 5,
    text: "The QR-verified certificate impressed every single interviewer. RedNotice Academy gave me real project experience that no bootcamp could match.",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&auto=format",
    program: "Full Stack Web Development",
  },
  {
    name: "Arjun Mehta",
    role: "Data Analyst at Flipkart",
    rating: 5,
    text: "Incredibly comprehensive Data Science program. The hands-on ML projects and verified certificate opened doors I never expected fresh out of college.",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&auto=format",
    program: "Data Science & ML",
  },
  {
    name: "Sneha Patel",
    role: "UI/UX Designer at Infosys",
    rating: 5,
    text: "Built a complete design portfolio in 2 months. My Figma projects from this internship landed me my dream job right after graduation.",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&auto=format",
    program: "UI/UX Design & Prototyping",
  },
  {
    name: "Rahul Gupta",
    role: "Growth Manager at Razorpay",
    rating: 5,
    text: "Real campaign experience with actual budgets and analytics data. The verified certificate and project portfolio were huge differentiators throughout my entire job search.",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&auto=format",
    program: "Digital Marketing & Growth",
  },
];

export const FAQS: FAQ[] = [
  {
    q: "Are these certificates recognized by companies?",
    a: "Yes — each certificate has a unique QR code employers can scan instantly to verify authenticity on our public verification portal.",
  },
  {
    q: "What certificates do I receive upon completion?",
    a: "You receive an official, QR-verified Internship Completion Certificate with tamper-proof digital verification.",
  },
  {
    q: "Is the internship self-paced?",
    a: "Yes. All programs are self-paced with flexible deadlines. Recommended weekly milestones help you stay on track without pressure.",
  },
  {
    q: "What is the refund policy?",
    a: "Full refund within 7 days of purchase. Partial refund within 30 days if less than 30% of the program is completed. Processed securely via Razorpay.",
  },
  {
    q: "What payment methods are accepted?",
    a: "All major credit/debit cards, UPI, net banking, and wallets via secure Razorpay integration. EMI options are available on select programs.",
  },
  {
    q: "How does QR certificate verification work?",
    a: "Visit our verification page, enter the Certificate ID or scan the QR code. The system instantly confirms validity, student name, program, and issue date.",
  },
];

export const CATEGORIES = ["All", "Technology", "Design", "Data", "Marketing", "Security"];
