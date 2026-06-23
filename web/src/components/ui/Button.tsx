"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success" | "outline";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
        {
          "bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-primary shadow-sm shadow-primary/25":
            variant === "primary",
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 focus:ring-secondary border border-border":
            variant === "secondary",
          "text-muted-foreground hover:text-foreground hover:bg-accent focus:ring-accent":
            variant === "ghost",
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus:ring-destructive shadow-sm shadow-destructive/25":
            variant === "danger",
          "bg-success text-success-foreground hover:bg-success/90 focus:ring-success shadow-sm shadow-success/25":
            variant === "success",
          "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground focus:ring-accent":
            variant === "outline",
        },
        {
          "h-8 px-3 text-xs": size === "sm",
          "h-10 px-4 text-sm": size === "md",
          "h-12 px-6 text-base": size === "lg",
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
