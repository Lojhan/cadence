import { Button, themeClassName } from "@cadence/ui";
import styles from "@cadence/ui/styles.css?url";
import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(
  {
    head: () => ({
      meta: [
        { charSet: "utf-8" },
        {
          name: "viewport",
          content: "width=device-width, initial-scale=1, viewport-fit=cover",
        },
        { title: "Cadence — one chord at a time" },
      ],
      links: [{ rel: "stylesheet", href: styles }],
    }),
    shellComponent: Root,
    errorComponent: ({ error, reset }) => (
      <main className="mx-auto max-w-lg p-8 text-foreground">
        <h1 className="font-[Georgia,serif] text-3xl">
          Could not open your practice.
        </h1>
        <p className="my-5 text-sm leading-relaxed text-muted-foreground">
          {error instanceof Error ? error.message : "Please try again."}
        </p>
        <Button onClick={reset}>Try again</Button>
      </main>
    ),
  },
);
const themeScript =
  "try{var t=localStorage.getItem('cadence-theme');document.documentElement.dataset.theme=t==='dark'||((!t||t==='system')&&matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light'}catch{}";
function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={themeClassName} suppressHydrationWarning>
      <head>
        <script>{themeScript}</script>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
