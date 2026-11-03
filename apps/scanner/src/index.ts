import { createServer } from "node:http";
import type { HealthResponse } from "@red/shared";

const PORT = Number(process.env.PORT ?? 4000);
const VERSION = "0.1.0";

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  if (req.method === "GET" && url.pathname === "/health") {
    const body: HealthResponse = {
      ok: true,
      service: "scanner",
      version: VERSION,
      uptimeSeconds: Math.round(process.uptime()),
    };
    res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
    res.end(JSON.stringify(body));
    return;
  }
  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: "not_found", path: url.pathname }));
});

server.listen(PORT, () => {
  console.log(`scanner listening on http://localhost:${PORT}`);
});

for (const sig of ["SIGINT", "SIGTERM"] as const)
  process.on(sig, () => server.close(() => process.exit(0)));
