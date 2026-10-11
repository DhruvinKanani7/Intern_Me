import React, { useState, useEffect } from "react";
import { useParams } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  QrCode, Hash, Search, CheckCircle, Award, Download, Check,
  Copy, AlertCircle,
} from "lucide-react";
import { api } from "../../lib/api";
import { formatDate, Spin, cn } from "../../lib/helpers";

export default function CertVerifyPage({ initialCode }: { initialCode?: string | null }) {
  const routeParams = useParams<{ code: string }>();
  const effectiveInitial = routeParams.code || initialCode || "";

  const [internshipCode, setInternshipCode] = useState(effectiveInitial);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [searched, setSearched] = useState(false);
  const [copied, setCopied] = useState(false);
  const verifiedCertificate = result?.certificate || result?.data || null;

  const performVerify = async (codeToVerify: string) => {
    if (!codeToVerify.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await api.certificates.verify(codeToVerify.trim());
      setResult(res);
    } catch {
      setResult({ valid: false });
    } finally {
      setSearched(true);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (effectiveInitial && effectiveInitial.trim()) {
      setInternshipCode(effectiveInitial.trim());
      performVerify(effectiveInitial.trim());
    }
  }, [effectiveInitial]);

  const handleCopyId = () => {
    const code =
      verifiedCertificate?.certId ||
      verifiedCertificate?.certificateId ||
      internshipCode;
    if (code) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    const url = verifiedCertificate?.download_url || verifiedCertificate?.pdf_url;
    if (url) {
      window.open(url, "_blank");
    } else {
      const code = verifiedCertificate?.certId || internshipCode;
      api.certificates
        .download(code)
        .then((res) => {
          if (res?.url) window.open(res.url, "_blank");
        })
        .catch(() => {
          window.open(`/api/verify/${encodeURIComponent(code)}`, "_blank");
        });
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    performVerify(internshipCode);
  };

  return (
    <div className="min-h-screen pt-24 pb-24 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <QrCode className="w-8 h-8 text-primary" />
          </div>
          <h1 className="font-display font-extrabold text-4xl text-foreground mb-3">
            Verify Certificate
          </h1>
          <p className="text-muted-foreground text-lg">
            Enter an Internship Code to instantly verify its authenticity.
          </p>
        </div>

        <form onSubmit={handleVerify} className="flex gap-3 mb-3">
          <div className="relative flex-1">
            <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={internshipCode}
              onChange={(e) => setInternshipCode(e.target.value)}
              placeholder="e.g. RNA-2024-WD-001247"
              className="w-full pl-10 pr-4 py-3.5 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !internshipCode.trim()}
            className="px-6 py-3.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-primary/20 flex-shrink-0"
          >
            {loading ? (
              <Spin />
            ) : (
              <>
                <Search className="w-4 h-4" /> Verify
              </>
            )}
          </button>
        </form>
        <p className="text-xs text-muted-foreground text-center mb-10">
          Enter the internship code printed on a certificate.
        </p>

        <AnimatePresence>
          {searched && result && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              {result.valid ? (
                <div className="bg-card border border-emerald-200 dark:border-emerald-800 rounded-2xl overflow-hidden shadow-xl shadow-emerald-500/5">
                  {/* Header */}
                  <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-6 text-white">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                        <CheckCircle className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-bold text-lg">Certificate Verified</p>
                        <p className="text-white/70 text-sm">
                          This certificate is authentic and active.
                        </p>
                      </div>
                    </div>
                  </div>
                  {/* Details */}
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Award className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Issued by</p>
                            <p className="font-bold text-foreground">RedNotice Academy</p>
                          </div>
                        </div>
                      </div>
                      <div className="w-16 h-16 bg-muted rounded-xl flex items-center justify-center">
                        <QrCode className="w-9 h-9 text-muted-foreground" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      {[
                        {
                          label: "Student Name",
                          value: verifiedCertificate?.name || verifiedCertificate?.studentName,
                        },
                        {
                          label: "Program",
                          value: verifiedCertificate?.internship,
                        },
                        {
                          label: "Duration",
                          value: verifiedCertificate?.duration,
                        },
                        {
                          label: "Issue Date",
                          value: formatDate(
                            verifiedCertificate?.issuedAt || verifiedCertificate?.issueDate
                          ),
                        },
                        {
                          label: "Certificate ID",
                          value:
                            verifiedCertificate?.certId ||
                            verifiedCertificate?.certificateId,
                        },
                        {
                          label: "Status",
                          value: "Active",
                        },
                      ].map(({ label, value }) => (
                        <div
                          key={label}
                          className={cn(
                            "bg-muted/50 rounded-xl p-3.5",
                            label === "Certificate ID" && "col-span-2"
                          )}
                        >
                          <p className="text-xs text-muted-foreground mb-1">{label}</p>
                          <p
                            className={cn(
                              "font-semibold text-foreground text-sm",
                              label === "Certificate ID" && "font-mono text-xs",
                              label === "Status" &&
                                "text-emerald-600 dark:text-emerald-400"
                            )}
                          >
                            {value}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={handleDownload}
                        className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                      >
                        <Download className="w-4 h-4" /> Download Certificate
                      </button>
                      <button
                        onClick={handleCopyId}
                        className="px-4 py-2.5 bg-muted text-muted-foreground rounded-xl text-sm font-semibold hover:bg-muted/80 transition-colors flex items-center gap-2"
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}{" "}
                        {copied ? "Copied!" : "Copy ID"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-card border border-red-200 dark:border-red-800 rounded-2xl p-8 text-center">
                  <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-7 h-7 text-red-500" />
                  </div>
                  <h3 className="font-bold text-xl text-foreground mb-2">
                    Certificate Not Found
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    No certificate found with ID{" "}
                    <strong className="font-mono text-foreground">{internshipCode}</strong>.
                    Please check the ID and try again.
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
