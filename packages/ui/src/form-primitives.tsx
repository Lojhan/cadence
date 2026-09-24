import { ChevronDown } from "lucide-react";
import type { ComponentPropsWithRef, HTMLAttributes, ReactNode } from "react";
import { cn } from "./lib/cn.ts";

export interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  htmlFor?: string;
  children?: ReactNode;
  className?: string;
}

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
  className,
}: FieldProps) {
  return (
    <label
      className={cn(
        "cadence-field my-5 block text-[13px] text-foreground max-[480px]:my-[18px]",
        className,
      )}
      htmlFor={htmlFor}
      data-slot="field"
    >
      <span className="cadence-field-label mb-2 block font-medium">
        {label}
      </span>
      {children}
      {hint && (
        <span className="cadence-field-hint mt-2 block text-xs leading-normal text-muted-foreground">
          {hint}
        </span>
      )}
      {error && (
        <span
          className="cadence-field-error mt-2 block text-xs leading-normal text-destructive"
          role="alert"
        >
          {error}
        </span>
      )}
    </label>
  );
}

export function Input({ className, ...props }: ComponentPropsWithRef<"input">) {
  return (
    <input
      data-slot="input"
      className={cn(
        "cadence-input min-h-12 w-full rounded-xl border border-border bg-background px-3.5 py-3 text-sm leading-[1.4] text-foreground transition-[background,border-color] duration-200 hover:bg-secondary focus-visible:border-primary max-[480px]:min-h-[50px] max-[480px]:text-base",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: ComponentPropsWithRef<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "cadence-input cadence-textarea min-h-36 w-full resize-y rounded-xl border border-border bg-background px-3.5 py-3 text-sm leading-[1.4] text-foreground transition-[background,border-color] duration-200 hover:bg-secondary focus-visible:border-primary max-[480px]:text-base",
        className,
      )}
      {...props}
    />
  );
}

export interface SelectProps extends ComponentPropsWithRef<"select"> {
  label: string;
  children?: ReactNode;
  wrapperClassName?: string;
}

export function Select({
  label,
  children,
  className,
  wrapperClassName,
  ...props
}: SelectProps) {
  return (
    <span
      className={cn(
        "cadence-select-control relative block w-[180px] shrink-0 [&>svg]:pointer-events-none [&>svg]:absolute [&>svg]:top-1/2 [&>svg]:right-3.5 [&>svg]:size-4 [&>svg]:-translate-y-1/2 [&>svg]:text-muted-foreground max-[480px]:w-full",
        wrapperClassName,
      )}
      data-slot="select-control"
    >
      <select
        data-slot="select"
        aria-label={label}
        className={cn(
          "cadence-select min-h-11 w-full cursor-pointer appearance-none rounded-xl border border-border bg-background py-3 pr-[42px] pl-3.5 text-sm leading-[1.4] text-foreground transition-[background,border-color] duration-200 hover:bg-secondary focus-visible:border-primary max-[480px]:min-h-[50px] max-[480px]:text-base",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown aria-hidden="true" />
    </span>
  );
}

export interface SurfaceProps extends HTMLAttributes<HTMLElement> {
  as?: "div" | "section" | "article";
  children?: ReactNode;
}

export function Surface({
  as: Component = "div",
  className,
  children,
  ...props
}: SurfaceProps) {
  return (
    <Component
      data-slot="surface"
      className={cn(
        "cadence-surface rounded-lg border border-border bg-[var(--white)] text-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
