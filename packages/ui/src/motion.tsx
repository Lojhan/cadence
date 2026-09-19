import {
  AnimatePresence,
  motion,
  useIsPresent,
  useReducedMotion,
} from "motion/react";
import type { ReactNode } from "react";

function Frame({
  children,
  direction,
  className,
}: {
  children: ReactNode;
  direction: number;
  className: string;
}) {
  const present = useIsPresent();
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      data-current={present}
      aria-hidden={present ? undefined : true}
      inert={!present}
      custom={direction}
      variants={{
        enter: (value: number) => ({
          x: reduced ? 0 : value * 16,
          opacity: reduced ? 1 : 0,
        }),
        visible: { x: 0, opacity: 1 },
        leave: (value: number) => ({
          x: reduced ? 0 : value * -16,
          opacity: reduced ? 1 : 0,
        }),
      }}
      initial="enter"
      animate="visible"
      exit="leave"
      transition={{ duration: reduced ? 0 : 0.22, ease: [0.22, 0.61, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
export function DirectionalGroup({
  children,
  transitionKey,
  direction,
  className,
  frameClassName,
}: {
  children: ReactNode;
  transitionKey: string;
  direction: number;
  className: string;
  frameClassName: string;
}) {
  return (
    <div className={className}>
      <AnimatePresence initial={false} custom={direction}>
        <Frame
          key={transitionKey}
          direction={direction}
          className={frameClassName}
        >
          {children}
        </Frame>
      </AnimatePresence>
    </div>
  );
}
