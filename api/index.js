const mongoose = require("mongoose");
mongoose.set("bufferCommands", false);

const config = require("../src/config/config");
const { corsMiddleware } = require("../src/config/cors");
const app = require("../src/app");

let cachedConnectionPromise;

function applyCors(req, res) {
  return new Promise((resolve, reject) => {
    corsMiddleware(req, res, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

async function connectToDatabase() {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  if (!cachedConnectionPromise) {
    cachedConnectionPromise = mongoose
      .connect(config.mongoose.url, config.mongoose.options)
      .catch((err) => {
        cachedConnectionPromise = null;
        throw err;
      });
  }

  await cachedConnectionPromise;
}

module.exports = async (req, res) => {
  try {
    await applyCors(req, res);
  } catch {
    return res.status(500).end();
  }

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  const pathname = (req.url || "/").split("?")[0];
  if (pathname === "/" || pathname === "/health") {
    return res.status(200).json({
      ok: true,
      service: "metaveler-backend",
      api: "/v1",
      hint: "MongoDB Atlas Network Access: Vercel icin 0.0.0.0/0 veya trafik izni gerekir.",
    });
  }

  try {
    await connectToDatabase();
    return app(req, res);
  } catch (error) {
    return res.status(500).json({
      code: 500,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
