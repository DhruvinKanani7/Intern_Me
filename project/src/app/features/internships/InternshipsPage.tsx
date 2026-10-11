import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Search, AlertCircle } from "lucide-react";
import { Internship } from "../../types";
import { CATEGORIES } from "../../constants/data";
import { api, ApiError } from "../../lib/api";
import { Spin, cn } from "../../lib/helpers";
import InternshipCard from "../../components/InternshipCard";

export default function InternshipsPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [sortBy, setSortBy] = useState("popular");
  const [listings, setListings] = useState<Internship[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState("");

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

  const filtered = listings
    .filter((i) => {
      const matchQ =
        !query ||
        i.title.toLowerCase().includes(query.toLowerCase()) ||
        i.skills.some((s) => s.toLowerCase().includes(query.toLowerCase()));
      const matchC =
        category === "All" || i.category.toLowerCase().includes(category.toLowerCase());
      return matchQ && matchC;
    })
    .sort((a, b) =>
      sortBy === "price-low"
        ? a.price - b.price
        : sortBy === "price-high"
        ? b.price - a.price
        : b.enrolled - a.enrolled
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
      <div className="flex flex-col md:flex-row gap-4 mb-10">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search programs, skills..."
            className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
          />
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1 flex-shrink-0">
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
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          aria-label="Sort programs by"
          className="px-4 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
        >
          <option value="popular">Most Popular</option>
          <option value="price-low">Price: Low to High</option>
          <option value="price-high">Price: High to Low</option>
        </select>
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
                <InternshipCard intern={intern} />
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
