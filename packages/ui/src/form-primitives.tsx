import { ChevronDown } from "lucide-react";
import type {
  ComponentPropsWithRef,
  ComponentType,
  HTMLAttributes,
  ReactNode,
} from "react";
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
      className={cn("cadence-field", className)}
      htmlFor={htmlFor}
      data-slot="field"
    >
      <span className="cadence-field-label">{label}</span>
      {children}
      {hint && <span className="cadence-field-hint">{hint}</span>}
      {error && (
        <span className="cadence-field-error" role="alert">
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
      className={cn("cadence-input", className)}
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
      className={cn("cadence-input cadence-textarea", className)}
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
      className={cn("cadence-select-control", wrapperClassName)}
      data-slot="select-control"
    >
      <select
        data-slot="select"
        aria-label={label}
        className={cn("cadence-select", className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown aria-hidden="true" />
    </span>
  );
}

export interface SegmentOption {
  value: string;
  label: string;
  icon?: ComponentType<{ "aria-hidden"?: boolean }>;
}

export interface SegmentedControlProps {
  label: string;
  value: string;
  options: readonly SegmentOption[];
  onChange: (value: string) => void;
  className?: string;
}

export function SegmentedControl({
  label,
  value,
  options,
  onChange,
  className,
}: SegmentedControlProps) {
  return (
    <nav
      className={cn("cadence-segments", className)}
      aria-label={label}
      data-slot="segmented-control"
    >
      {options.map((option) => {
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            data-slot="segment"
            aria-current={option.value === value ? "page" : undefined}
            aria-pressed={option.value === value}
            onClick={() => onChange(option.value)}
          >
            {Icon && <Icon aria-hidden={true} />}
            {option.label}
          </button>
        );
      })}
    </nav>
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
      className={cn("cadence-surface", className)}
      {...props}
    >
      {children}
    </Component>
  );
}
