import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "./lib/cn.ts";

export const buttonVariants = cva(
  "pill inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-transparent px-5 text-sm font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground",
        primary: "bg-primary text-primary-foreground hover:bg-primary/85",
        ghost:
          "bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/85",
      },
      size: {
        sm: "min-h-9 px-4 text-xs",
        default: "min-h-11 px-5 text-sm",
        lg: "min-h-12 px-6 text-base",
      },
    },
    defaultVariants: { variant: "secondary", size: "default" },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({
  children,
  className,
  variant = "secondary",
  size = "default",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      data-slot="button"
      data-variant={variant}
      data-size={size}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {children}
    </button>
  );
}

export interface IconButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children?: ReactNode;
  size?: "default" | "lg";
}

export function IconButton({
  label,
  children,
  className,
  size = "default",
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      data-slot="icon-button"
      data-size={size}
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "icon-button inline-grid shrink-0 place-items-center rounded-full bg-transparent text-foreground transition-colors duration-200 hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        size === "lg" ? "size-12" : "size-11",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
