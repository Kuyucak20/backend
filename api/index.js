const mongoose = require("mongoose");
const app = require("../src/app");
const config = require("../src/config/config");

let cachedConnectionPromise;

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
