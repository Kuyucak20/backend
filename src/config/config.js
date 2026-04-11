const dotenv = require("dotenv");
const path = require("path");
const Joi = require("joi");

dotenv.config({ path: path.join(__dirname, "../../.env") });

/** Test ortamında veritabanı adına _test ekler */
function applyTestDatabaseSuffix(uri) {
  if (!uri) return uri;

  const q = uri.indexOf("?");
  const pathAndHost = q === -1 ? uri : uri.slice(0, q);
  const qs = q === -1 ? "" : uri.slice(q);

  const m = pathAndHost.match(/^(mongodb(?:\+srv)?:\/\/[^/]+)\/([^/]*)$/);
  if (!m) return uri;

  const [, prefix, db] = m;
  const newDb = db ? `${db}_test` : "test_db";

  return `${prefix}/${newDb}${qs}`;
}

const envVarsSchema = Joi.object()
  .keys({
    NODE_ENV: Joi.string()
      .valid("production", "development", "test")
      .default("production"),
    PORT: Joi.number().default(3001),
    MONGODB_URL: Joi.string()
      .required()
      .description("MongoDB connection URL"),
    JWT_SECRET: Joi.string()
      .required()
      .description("JWT secret key"),
    JWT_ACCESS_EXPIRATION_MINUTES: Joi.number().default(180),
    JWT_REFRESH_EXPIRATION_DAYS: Joi.number().default(30),
    JWT_RESET_PASSWORD_EXPIRATION_MINUTES: Joi.number().default(10),
    JWT_VERIFY_EMAIL_EXPIRATION_MINUTES: Joi.number().default(10),
    BNB_RPC_URL: Joi.string().default('https://data-seed-prebsc-1-s1.binance.org:8545'),
    BNB_CHAIN_ID: Joi.number().default(97),
    BNB_OWNER_PRIVATE_KEY: Joi.string().default('6e39e078281d54343421b85d230965ca184af74e051415c5eee8735655af6b2f'),
    NFT_CONTRACT_ADDRESS: Joi.string().default('0x8e8B1dA32279a5b96740E7F365DDfd4a820BfBA6'),
  })
  .unknown();

const { value: envVars, error } = envVarsSchema
  .prefs({ errors: { label: "key" } })
  .validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const mongoUrl =
  envVars.NODE_ENV === "test"
    ? applyTestDatabaseSuffix(envVars.MONGODB_URL)
    : envVars.MONGODB_URL;

module.exports = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  mongoose: {
    url: mongoUrl,
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 20000,
      maxPoolSize: 10,
    },
  },
  bnb: {
    rpcUrl: envVars.BNB_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545',
    chainId: envVars.BNB_CHAIN_ID || 97,
    ownerPrivateKey: envVars.BNB_OWNER_PRIVATE_KEY || '6e39e078281d54343421b85d230965ca184af74e051415c5eee8735655af6b2f',
    nftContractAddress: envVars.NFT_CONTRACT_ADDRESS || '0x8e8B1dA32279a5b96740E7F365DDfd4a820BfBA6',
  },
  jwt: {
    secret: envVars.JWT_SECRET,
    accessExpirationMinutes: envVars.JWT_ACCESS_EXPIRATION_MINUTES,
    refreshExpirationDays: envVars.JWT_REFRESH_EXPIRATION_DAYS,
    resetPasswordExpirationMinutes: envVars.JWT_RESET_PASSWORD_EXPIRATION_MINUTES,
    verifyEmailExpirationMinutes: envVars.JWT_VERIFY_EMAIL_EXPIRATION_MINUTES,
  },
};