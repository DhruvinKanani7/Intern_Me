import React, { useState } from "react";
import { CheckCircle, AlertCircle, Mail, Phone, MapPin } from "lucide-react";
import { api, ApiError } from "../lib/api";
import { Badge, Spin } from "../lib/helpers";

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });

  const update =
    (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.name || !form.email || !form.message) {
      setError("Please fill in your name, email, and message.");
      return;
    }
    setLoading(true);
    try {
      await (api.contact.submit || api.contact.send)(form);
      setSent(true);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Couldn't send your message. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-24 pb-24 max-w-7xl mx-auto px-6">
      <div className="text-center mb-14">
        <Badge color="violet">Contact Us</Badge>
        <h1 className="font-display font-extrabold text-4xl text-foreground mt-4 mb-3">
          We&apos;d love to hear from you
        </h1>
        <p className="text-muted-foreground text-lg">
          Questions, feedback, or partnership inquiries — reach out anytime.
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div>
          {sent ? (
            <div className="bg-card border border-emerald-200 dark:border-emerald-800 rounded-2xl p-12 text-center">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
              <h3 className="font-bold text-xl text-foreground mb-2">Message Sent!</h3>
              <p className="text-muted-foreground text-sm">
                We&apos;ll get back to you within 24 hours.
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="bg-card border border-border rounded-2xl p-7 flex flex-col gap-4"
            >
              {error && (
                <div className="flex items-center gap-2.5 p-3.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                </div>
              )}
              {[
                {
                  label: "Your Name",
                  placeholder: "Priya Sharma",
                  type: "text",
                  field: "name" as const,
                },
                {
                  label: "Email",
                  placeholder: "you@example.com",
                  type: "email",
                  field: "email" as const,
                },
                {
                  label: "Subject",
                  placeholder: "How can we help?",
                  type: "text",
                  field: "subject" as const,
                },
              ].map(({ label, placeholder, type, field }) => (
                <div key={label}>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">
                    {label}
                  </label>
                  <input
                    type={type}
                    value={form[field]}
                    onChange={update(field)}
                    placeholder={placeholder}
                    className="w-full px-4 py-3 bg-input-background border border-border rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all text-foreground"
                  />
                </div>
              ))}
              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">
                  Message
                </label>
                <textarea
                  rows={4}
                  value={form.message}
                  onChange={update("message")}
                  placeholder="Tell us more..."
                  className="w-full px-4 py-3 bg-input-background border border-border rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all text-foreground resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                {loading ? <Spin /> : "Send Message"}
              </button>
            </form>
          )}
        </div>

        <div className="flex flex-col gap-5">
          {[
            {
              icon: Mail,
              label: "Email Us",
              value: "hello@rednoticeacademy.com",
              sub: "We reply within 24 hours",
            },
            {
              icon: Phone,
              label: "Call Us",
              value: "+91 98765 43210",
              sub: "Mon–Fri, 9 AM to 6 PM IST",
            },
            {
              icon: MapPin,
              label: "Office",
              value: "Mumbai, Maharashtra, India",
              sub: "Visit by appointment",
            },
          ].map(({ icon: Icon, label, value, sub }) => (
            <div
              key={label}
              className="bg-card border border-border rounded-2xl p-6 flex items-center gap-5 hover:border-primary/20 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-5.5 h-5.5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                <p className="font-semibold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
