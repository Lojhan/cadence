import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
export default defineConfig({
  plugins: [
    tanstackStart({
      importProtection: {
        behavior: "error",
        client: {
          specifiers: [
            "@cadence/db",
            "@cadence/db/*",
            "@cadence/application",
            "better-sqlite3",
            "pg",
            "drizzle-orm",
          ],
        },
      },
    }),
    nitro({ preset: "node-server", traceDeps: ["better-sqlite3*", "pg*"] }),
    react(),
  ],
  ssr: { external: ["better-sqlite3", "pg"] },
  build: { assetsInlineLimit: 0 },
  worker: { format: "es" },
});
