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
  activeClassName?: string;
}

export function SegmentedControl({
  label,
  value,
  options,
  onChange,
  className,
  activeClassName = "bg-[var(--white)] text-foreground",
}: SegmentedControlProps) {
  return (
    <nav
      className={cn(
        "cadence-segments flex shrink-0 gap-1 rounded-[17px] border border-border bg-background p-[5px]",
        className,
      )}
      aria-label={label}
      data-slot="segmented-control"
    >
      {options.map((option) => {
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            className={cn(
              "inline-flex min-h-[46px] flex-1 items-center justify-center gap-[7px] rounded-xl border-0 bg-transparent px-2 py-2.5 text-xs text-muted-foreground transition-colors duration-200 hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary [&_svg]:size-[17px]",
              option.value === value && activeClassName,
            )}
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
