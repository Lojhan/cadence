import { ChevronDown, ChevronUp, Mic, MicOff } from "lucide-react";
import {
  createContext,
  type HTMLAttributes,
  type ReactNode,
  useContext,
  useState,
} from "react";
import { cn } from "./lib/cn.ts";
import { Popover } from "./overlays.tsx";
import { IconButton, type IconButtonProps } from "./primitives.tsx";

export function ControlDock({
  label,
  active = false,
  className,
  children,
}: {
  label: string;
  active?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <nav
      className={cn("transport idle-ui", active && "listening", className)}
      aria-label={label}
    >
      {children}
    </nav>
  );
}

export function DockGroup({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("dock-group", className)} {...props}>
      {children}
    </div>
  );
}

export function DockButton({ className, ...props }: IconButtonProps) {
  return <IconButton className={cn("dock-button", className)} {...props} />;
}

export function DockDivider() {
  return <span className="dock-divider" aria-hidden="true" />;
}

export function MicrophoneDockControls({
  listening,
  busy = false,
  onToggle,
  optionsOpen,
  onOptionsOpenChange,
  children,
}: {
  listening: boolean;
  busy?: boolean;
  onToggle: () => void;
  optionsOpen?: boolean;
  onOptionsOpenChange?: (open: boolean) => void;
  children?: ReactNode;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = optionsOpen ?? internalOpen;
  return (
    <DockGroup className="mic-group">
      <DockButton
        label={listening ? "Mute microphone" : "Unmute microphone"}
        className="mic"
        aria-pressed={listening}
        disabled={busy}
        onClick={onToggle}
      >
        <span className="signal" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        {listening ? <Mic aria-hidden="true" /> : <MicOff aria-hidden="true" />}
      </DockButton>
      <DockButtonMenu
        label="Microphone options"
        icon={
          open ? (
            <ChevronDown aria-hidden="true" />
          ) : (
            <ChevronUp aria-hidden="true" />
          )
        }
        open={open}
        onOpenChange={onOptionsOpenChange ?? setInternalOpen}
        className="mic-options-toggle"
      >
        {children}
      </DockButtonMenu>
    </DockGroup>
  );
}

const MenuContext = createContext<(() => void) | null>(null);

export function DockButtonMenu({
  label,
  icon,
  children,
  className,
  open,
  onOpenChange,
  align = "center",
}: {
  label: string;
  icon: ReactNode;
  children?: ReactNode;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  align?: "start" | "center" | "end";
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const shown = open ?? internalOpen;
  const change = onOpenChange ?? setInternalOpen;
  return (
    <Popover
      open={shown}
      onOpenChange={change}
      align={align}
      trigger={
        <DockButton label={label} aria-expanded={shown} className={className}>
          {icon}
        </DockButton>
      }
    >
      <MenuContext.Provider value={() => change(false)}>
        <fieldset className="dock-menu" aria-label={label}>
          {children}
        </fieldset>
      </MenuContext.Provider>
    </Popover>
  );
}

export function DockMenuItem({
  selected = false,
  onSelect,
  children,
}: {
  selected?: boolean;
  onSelect: () => void;
  children?: ReactNode;
}) {
  const close = useContext(MenuContext);
  return (
    <button
      type="button"
      className="dock-menu-item"
      aria-current={selected ? "true" : undefined}
      onClick={() => {
        onSelect();
        close?.();
      }}
    >
      {children}
    </button>
  );
}
