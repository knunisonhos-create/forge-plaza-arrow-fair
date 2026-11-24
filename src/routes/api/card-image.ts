import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/card-image")({
  server: {
    handlers: {
      POST: async () =>
        Response.json({
          error:
            "A geração de retrato por IA não está disponível. O desenho vetorial da espécie continua no lugar.",
          code: "MISSING_API_KEY",
        }),
    },
  },
});
