import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/card-image/$cardId")({
  server: {
    handlers: {
      GET: async () => Response.json({ cached: false }),
    },
  },
});
