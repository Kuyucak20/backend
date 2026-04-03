/**
 * Ada/arsa grid'ini doldurur (Nova + Atlas, 2000 kayıt).
 * Kullanım: npm run seed:lands
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const mongoose = require("mongoose");
mongoose.set("bufferCommands", false);

const config = require("../src/config/config");
const { landService } = require("../src/services");

async function main() {
  await mongoose.connect(config.mongoose.url, config.mongoose.options);
  // eslint-disable-next-line no-console
  console.log("MongoDB bağlandı:", config.mongoose.url.replace(/:[^:@/]+@/, ":****@"));

  const result = await landService.initializeNewLands();
  // eslint-disable-next-line no-console
  console.log(result);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
