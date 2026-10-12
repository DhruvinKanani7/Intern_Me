import React from "react";
import { motion } from "motion/react";
import { Clock, Star, Users, ArrowRight, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router";
import { useApp } from "../context/AppContext";
import { Internship } from "../types";
import { Badge, StarRow, cn } from "../lib/helpers";

export default function InternshipCard({
  intern,
  isRegistered,
}: {
  intern: Internship;
  isRegistered?: boolean;
}) {
  const { go } = useApp();
  const navigate = useNavigate();
  const levelColor: Record<string, "green" | "amber" | "red"> = {
    Beginner: "green",
    Intermediate: "amber",
    Advanced: "red",
  };

  return (
    <motion.div
      whileHover={{ y: -5, shadow: "0 20px 40px rgba(0,0,0,0.12)" }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="bg-card border border-border rounded-2xl overflow-hidden group cursor-pointer flex flex-col h-full hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300"
      onClick={() => go("detail", { id: intern.id })}
    >
      <div className="relative overflow-hidden bg-muted" style={{ paddingBottom: "58%" }}>
        <img
          src={intern.image || "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&auto=format&fit=crop&q=80"}
          alt={intern.title}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
        {isRegistered ? (
          <div className="absolute top-3 left-3 z-10">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-600/90 text-white shadow-md backdrop-blur-sm border border-emerald-400/30">
              <CheckCircle className="w-3 h-3" /> Registered
            </span>
          </div>
        ) : intern.badge ? (
          <div className="absolute top-3 left-3">
            <Badge color="amber">{intern.badge}</Badge>
          </div>
        ) : null}
        <div className="absolute top-3 right-3">
          <Badge color={levelColor[intern.level || "Beginner"] || "slate"}>
            {intern.level || "Beginner"}
          </Badge>
        </div>
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white/90 text-xs">
          <span className="flex items-center gap-1 font-medium bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-md">
            <Users className="w-3 h-3 text-amber-400" />
            {(intern.enrolled ?? 0).toLocaleString()} enrolled
          </span>
          <span className="flex items-center gap-1 font-medium bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-md">
            <Clock className="w-3 h-3 text-primary-foreground" />
            {intern.duration || "1 - 5 Months"}
          </span>
        </div>
      </div>
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-2">
          <Badge color="violet">{intern.category}</Badge>
        </div>
        <h3 className="font-display font-semibold text-base text-foreground mb-2 leading-snug group-hover:text-primary transition-colors line-clamp-1">
          {intern.title}
        </h3>
        <p className="text-xs text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
          {intern.description}
        </p>
        <div className="flex items-center gap-2 mb-4">
          <StarRow rating={intern.rating ?? 4.8} />
          <span className="text-xs font-semibold text-foreground">{intern.rating ?? 4.8}</span>
          <span className="text-xs text-muted-foreground">
            ({(intern.reviews ?? 0).toLocaleString()} reviews)
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {(intern.skills || []).slice(0, 3).map((s) => (
            <span key={s} className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded-md">
              {s}
            </span>
          ))}
          {(intern.skills || []).length > 3 && (
            <span className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded-md">
              +{(intern.skills || []).length - 3}
            </span>
          )}
        </div>
        <div className="mt-auto pt-3 border-t border-border/70 flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
              Starting from
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-foreground">
                ₹{(intern.price ?? 0).toLocaleString()}
              </span>
              {intern.originalPrice ? (
                <span className="text-xs text-muted-foreground line-through">
                  ₹{intern.originalPrice.toLocaleString()}
                </span>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (isRegistered) {
                navigate("/student?tab=internships");
              } else {
                go("detail", { id: intern.id });
              }
            }}
            className={cn(
              "inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl active:scale-95 transition-all shadow-sm group-hover:shadow-md",
              isRegistered
                ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/25"
                : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/20"
            )}
          >
            {isRegistered ? (
              <>
                <span>My Internship</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </>
            ) : (
              <>
                <span>Apply Now</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
