import { Tabs as TabsPrimitive } from "radix-ui";
import type { ComponentProps, ComponentType, ReactNode } from "react";
import { cn } from "./lib/cn.ts";

export interface TabOption {
  value: string;
  label: string;
  icon?: ComponentType<{ "aria-hidden"?: boolean }>;
}

export interface TabsProps {
  label: string;
  value: string;
  options: readonly TabOption[];
  onChange: (value: string) => void;
  children?: ReactNode;
  className?: string;
  listClassName?: string;
}

export function Tabs({
  label,
  value,
  options,
  onChange,
  children,
  className,
  listClassName,
}: TabsProps) {
  return (
    <TabsPrimitive.Root
      value={value}
      onValueChange={onChange}
      className={cn("flex min-h-0 flex-col", className)}
      data-slot="tabs"
    >
      <TabsPrimitive.List
        aria-label={label}
        className={cn(
          "inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-secondary p-1 text-muted-foreground",
          listClassName,
        )}
        data-slot="tabs-list"
      >
        {options.map((option) => {
          const Icon = option.icon;
          return (
            <TabsPrimitive.Trigger
              key={option.value}
              value={option.value}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
              data-slot="tabs-trigger"
            >
              {Icon && <Icon aria-hidden={true} />}
              {option.label}
            </TabsPrimitive.Trigger>
          );
        })}
      </TabsPrimitive.List>
      {children}
    </TabsPrimitive.Root>
  );
}

export function TabsContent({
  className,
  ...props
}: ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn("min-h-0 outline-none", className)}
      data-slot="tabs-content"
      {...props}
    />
  );
}
