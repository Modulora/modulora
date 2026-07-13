/** Fumadocs headless source: content pipeline only — the UI is ours. */
import { loader } from "fumadocs-core/source";
import { docs } from "collections/server";

export const docsSource = loader({
  source: docs.toFumadocsSource(),
  baseUrl: "/docs",
});
