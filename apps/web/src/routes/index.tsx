import { PracticeApp } from "@cadence/features";
import { createFileRoute } from "@tanstack/react-router";
import * as functions from "../functions/cadence.functions";
import { gateway } from "../lib/gateway.ts";

export const Route = createFileRoute("/")({
  loader: () => functions.bootstrap(),
  component: Home,
});
function Home() {
  return <PracticeApp gateway={gateway} initial={Route.useLoaderData()} />;
}
