import React from "react";
import { motion } from "motion/react";
import { Clock, Star, Users } from "lucide-react";
import { useApp } from "../context/AppContext";
import { Internship } from "../types";
import { Badge, StarRow } from "../lib/helpers";

export default function InternshipCard({ intern }: { intern: Internship }) {
  const { go } = useApp();
  const levelColor: Record<string, "green" | "amber" | "red"> = {
    Beginner: "green",
    Intermediate: "amber",
    Advanced: "red",
  };

  return (
    <motion.div
      whileHover={{ y: -4, shadow: "0 20px 40px rgba(0,0,0,0.1)" }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="bg-card border border-border rounded-2xl overflow-hidden group cursor-pointer flex flex-col h-full hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300"
      onClick={() => go("detail", { id: intern.id })}
    >
      <div className="relative overflow-hidden bg-muted" style={{ paddingBottom: "60%" }}>
        <img
          src={intern.image}
          alt={intern.title}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {intern.badge && (
          <div className="absolute top-3 left-3">
            <Badge color="amber">{intern.badge}</Badge>
          </div>
        )}
        <div className="absolute top-3 right-3">
          <Badge color={levelColor[intern.level] || "slate"}>{intern.level}</Badge>
        </div>
      </div>
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-2">
          <Badge color="violet">{intern.category}</Badge>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {intern.duration}
          </span>
        </div>
        <h3 className="font-display font-semibold text-base text-foreground mb-2 leading-snug group-hover:text-primary transition-colors">
          {intern.title}
        </h3>
        <p className="text-xs text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
          {intern.description}
        </p>
        <div className="flex items-center gap-2 mb-4">
          <StarRow rating={intern.rating} />
          <span className="text-xs font-semibold text-foreground">{intern.rating}</span>
          <span className="text-xs text-muted-foreground">
            ({intern.reviews.toLocaleString()} reviews)
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {intern.skills.slice(0, 3).map((s) => (
            <span key={s} className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded-md">
              {s}
            </span>
          ))}
          {intern.skills.length > 3 && (
            <span className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded-md">
              +{intern.skills.length - 3}
            </span>
          )}
        </div>
        <div className="mt-auto flex items-center justify-between">
          <div>
            <span className="text-xl font-bold text-foreground">
              ₹{intern.price.toLocaleString()}
            </span>
            {intern.originalPrice && (
              <span className="ml-2 text-sm text-muted-foreground line-through">
                ₹{intern.originalPrice.toLocaleString()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="w-3.5 h-3.5" />
            {intern.enrolled.toLocaleString()}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
