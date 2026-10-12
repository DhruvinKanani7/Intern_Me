import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search, AlertCircle, ChevronDown, Check, TrendingUp,
  ArrowDownWideNarrow, ArrowUpWideNarrow,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { Internship } from "../../types";
import { CATEGORIES } from "../../constants/data";
import { api, ApiError } from "../../lib/api";
import { Spin, cn } from "../../lib/helpers";
import InternshipCard from "../../components/InternshipCard";

export default function InternshipsPage() {
  const { user } = useApp();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [sortBy, setSortBy] = useState("popular");
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const [listings, setListings] = useState<Internship[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState("");
  const [userEnrollments, setUserEnrollments] = useState<any[]>([]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setSortDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (user) {
      api.enrollment
        .getMyEnrollments()
        .then((data) => setUserEnrollments(data || []))
        .catch(() => setUserEnrollments([]));
    } else {
      setUserEnrollments([]);
    }
  }, [user]);

  useEffect(() => {
    setLoadingList(true);
    setListError("");
    api.internships
      .getAll({ search: query, category })
      .then((data) => setListings(data || []))
      .catch((err) =>
        setListError(
          err instanceof ApiError
            ? err.message
            : "Couldn't load programs. Please try again."
        )
      )
      .finally(() => setLoadingList(false));
  }, [query, category]);

  const isInternshipRegistered = (intern: Internship) => {
    return userEnrollments.some((en) => {
      const enInternshipId = en.internship_id?._id || en.internship_id?.id || en.internship_id;
      const enCategoryCode = (en.internship_id?.category_code || en.category_code || "").toUpperCase();
      const internId = (intern?.id || "").toUpperCase();
      const internCode = (intern?.code || "").toUpperCase();
      return (
        enInternshipId === intern.id ||
        (enCategoryCode && internCode && enCategoryCode === internCode) ||
        (enCategoryCode && internId && enCategoryCode === internId)
      );
    });
  };

  const sortOptions = [
    { value: "popular", label: "Most Popular", icon: TrendingUp },
    { value: "price-low", label: "Price: Low to High", icon: ArrowDownWideNarrow },
    { value: "price-high", label: "Price: High to Low", icon: ArrowUpWideNarrow },
  ];

  const currentSortOption = sortOptions.find((o) => o.value === sortBy) || sortOptions[0];

  const filtered = listings
    .filter((i) => {
      const matchQ =
        !query ||
        (i.title || "").toLowerCase().includes(query.toLowerCase()) ||
        (i.skills || []).some((s) => s.toLowerCase().includes(query.toLowerCase()));
      const matchC =
        category === "All" || (i.category || "").toLowerCase().includes(category.toLowerCase());
      return matchQ && matchC;
    })
    .sort((a, b) =>
      sortBy === "price-low"
        ? (a.price || 0) - (b.price || 0)
        : sortBy === "price-high"
        ? (b.price || 0) - (a.price || 0)
        : (b.enrolled || 0) - (a.enrolled || 0)
    );

  return (
    <div className="pt-24 pb-24 max-w-7xl mx-auto px-6">
      <div className="mb-10">
        <h1 className="font-display font-extrabold text-4xl text-foreground mb-2">
          Internship Programs
        </h1>
        <p className="text-muted-foreground text-lg">
          52+ programs across 6 domains. All with QR-verified certificates.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-10 items-stretch md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search programs, skills..."
            className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all shadow-sm"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 flex-shrink-0 scrollbar-none">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                "px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all border",
                category === c
                  ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                  : "bg-card border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
              )}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Enhanced Custom Sort Dropdown Menu */}
        <div className="relative flex-shrink-0" ref={sortDropdownRef}>
          <button
            type="button"
            onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
            className="flex items-center gap-2.5 px-4 py-3 bg-card hover:bg-muted/70 border border-border rounded-xl text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all shadow-sm"
          >
            <currentSortOption.icon className="w-4 h-4 text-primary" />
            <span>{currentSortOption.label}</span>
            <ChevronDown
              className={cn(
                "w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ml-1",
                sortDropdownOpen && "rotate-180"
              )}
            />
          </button>

          <AnimatePresence>
            {sortDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-2xl shadow-xl p-1.5 z-50 overflow-hidden"
              >
                <div className="flex flex-col gap-0.5">
                  {sortOptions.map((opt) => {
                    const isSelected = sortBy === opt.value;
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setSortBy(opt.value);
                          setSortDropdownOpen(false);
                        }}
                        className={cn(
                          "flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left",
                          isSelected
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-muted text-foreground"
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className={cn("w-4 h-4", isSelected ? "text-primary" : "text-muted-foreground")} />
                          <span>{opt.label}</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {loadingList ? (
        <div className="text-center py-24">
          <Spin />
        </div>
      ) : listError ? (
        <div className="text-center py-24">
          <AlertCircle className="w-12 h-12 text-red-500/60 mx-auto mb-4" />
          <p className="text-lg font-semibold text-foreground mb-2">
            Couldn't load programs
          </p>
          <p className="text-muted-foreground text-sm">{listError}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24">
          <Search className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-lg font-semibold text-foreground mb-2">No programs found</p>
          <p className="text-muted-foreground text-sm">
            Try adjusting your search or filter.
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-6">
            {filtered.length} programs found
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((intern, i) => (
              <motion.div
                key={intern.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.4 }}
                className="h-full"
              >
                <InternshipCard
                  intern={intern}
                  isRegistered={isInternshipRegistered(intern)}
                />
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
