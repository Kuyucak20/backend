const cors = require("cors");

function parseCorsOrigins() {
  const fromEnv = (process.env.CORS_ORIGIN || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const defaults = [
    "https://frontend-xi-blue-62.vercel.app",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ];
  return [...new Set([...defaults, ...fromEnv])];
}

const allowedOrigins = parseCorsOrigins();

const corsOptions = {
  origin(origin, callback) {
    if (!origin) {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    try {
      const host = new URL(origin).hostname;
      if (host === "localhost" || host.endsWith(".vercel.app")) {
        return callback(null, true);
      }
    } catch {
      return callback(null, false);
    }
    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  optionsSuccessStatus: 204,
};

const corsMiddleware = cors(corsOptions);

module.exports = {
  corsMiddleware,
  corsOptions,
};
