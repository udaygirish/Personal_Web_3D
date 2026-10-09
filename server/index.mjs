import { createApp } from "./app.mjs";
const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 3000);
const server = createApp().listen(port, host, () =>
  console.log(`Universe server listening on ${host}:${port}`),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => server.close(() => process.exit(0)));
