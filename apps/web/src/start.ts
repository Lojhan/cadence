import {
  createCsrfMiddleware,
  createMiddleware,
  createStart,
} from "@tanstack/react-start";

import { bodyWithinLimit } from "./server/body-limit.server.ts";

const personalOrigin = createMiddleware().server(async ({ request, next }) => {
  const expected = new URL(
    process.env.PUBLIC_ORIGIN ?? "http://localhost:3000",
  );
  const actual = new URL(request.url);
  if (actual.host !== expected.host)
    return new Response("Unrecognized host", { status: 403 });
  if (!(await bodyWithinLimit(request, 11_000_000)))
    return new Response("Request too large", { status: 413 });
  const result = await next();
  result.response.headers.set(
    "Permissions-Policy",
    "microphone=(self), camera=()",
  );
  result.response.headers.set("X-Content-Type-Options", "nosniff");
  result.response.headers.set("Referrer-Policy", "same-origin");
  result.response.headers.set("Cache-Control", "no-store");
  return result;
});
export const startInstance = createStart(() => ({
  requestMiddleware: [
    personalOrigin,
    createCsrfMiddleware({
      filter: (context) => context.handlerType === "serverFn",
    }),
  ],
}));
