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
      <main className="panel-body">
        <h1>Could not open your practice.</h1>
        <p>{error instanceof Error ? error.message : "Please try again."}</p>
        <button type="button" onClick={reset}>
          Try again
        </button>
      </main>
    ),
  },
);
const themeScript =
  "try{var t=localStorage.getItem('cadence-theme');document.documentElement.dataset.theme=t==='dark'||((!t||t==='system')&&matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light'}catch{}";
function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
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
