const mongoose = require("mongoose");
const app = require("../src/app");
const config = require("../src/config/config");
const { corsMiddleware } = require("../src/config/cors");

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
  if (mongoose.connection.readyState >= 1) {
    return;
  }

  if (!cachedConnectionPromise) {
    cachedConnectionPromise = mongoose.connect(
      config.mongoose.url,
      config.mongoose.options
    );
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
