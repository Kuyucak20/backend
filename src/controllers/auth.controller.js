const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const { authService, userService, tokenService, emailService, landService, nftService } = require('../services');

/**
 * Generate a unique 8-char alphanumeric referral code
 */
const generateReferralCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const register = catchAsync(async (req, res) => {
  req.body.description = '';
  req.body.balance = 0;
  req.body.avatar = '';
  req.body.usdtWallet = req.body.usdtWallet || req.body.wallet || '';

  const inviteCode = (req.body.referredBy || req.body.referralCode || '').trim() || undefined;

  // Generate unique referral code (yeni kullanicinin kendi davet kodu)
  let newReferralCode;
  let isUnique = false;
  while (!isUnique) {
    newReferralCode = generateReferralCode();
    const existing = await userService.getUserByReferralCode(newReferralCode);
    if (!existing) {
      isUnique = true;
    }
  }
  req.body.referralCode = newReferralCode;
  req.body.referralCount = 0;
  if (inviteCode) {
    req.body.referredBy = inviteCode;
  }

  // BNB cuzdan olustur
  const bnbWallet = nftService.createWallet();
  req.body.bnbWallet = bnbWallet;

  const user = await userService.createUser(req.body);

  // Referral: sadece referredBy kaydedilir.
  // Referans sayaci, davet edilen kisi ilk arsasini aldiginda artacak (buyLand icinde).

  const tokens = await tokenService.generateAuthTokens(user);
  res.status(httpStatus.CREATED).send({ user, tokens });
});

const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const user = await authService.loginUserWithEmailAndPassword(email, password);
  const tokens = await tokenService.generateAuthTokens(user);
  res.send({ user, tokens });
});

const logout = catchAsync(async (req, res) => {
  await authService.logout(req.body.refreshToken);
  res.status(httpStatus.NO_CONTENT).send();
});

const refreshTokens = catchAsync(async (req, res) => {
  const tokens = await authService.refreshAuth(req.body.refreshToken);
  res.send({ ...tokens });
});

const forgotPassword = catchAsync(async (req, res) => {
  const resetPasswordToken = await tokenService.generateResetPasswordToken(req.body.email);
  await emailService.sendResetPasswordEmail(req.body.email, resetPasswordToken);
  res.status(httpStatus.NO_CONTENT).send();
});

const resetPassword = catchAsync(async (req, res) => {
  await authService.resetPassword(req.body.token, req.body.password);
  res.status(httpStatus.NO_CONTENT).send();
});

const sendVerificationEmail = catchAsync(async (req, res) => {
  const verifyEmailToken = await tokenService.generateVerifyEmailToken(req.user);
  await emailService.sendVerificationEmail(req.user.email, verifyEmailToken);
  res.status(httpStatus.NO_CONTENT).send();
});

const verifyEmail = catchAsync(async (req, res) => {
  await authService.verifyEmail(req.query.token);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  register,
  login,
  logout,
  refreshTokens,
  forgotPassword,
  resetPassword,
  sendVerificationEmail,
  verifyEmail,
};
