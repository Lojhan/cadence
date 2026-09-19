import { createFileRoute } from "@tanstack/react-router";
import { call } from "../server/service.server";
export const Route = createFileRoute("/ready")({
  server: {
    handlers: {
      GET: async () => {
        try {
          await call((app, actor) => app.library(actor));
          return Response.json({ status: "ready" });
        } catch {
          return Response.json({ status: "unavailable" }, { status: 503 });
        }
      },
    },
  },
});
