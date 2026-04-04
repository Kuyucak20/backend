const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const calculateCurrentPrice = require('../utils/calculateLandPrice');
const { userService, landService, contactService, paymentService } = require('../services');

const createUser = catchAsync(async (req, res) => {
  const user = await userService.createUser(req.body);
  res.status(httpStatus.CREATED).send(user);
});

const createContact = catchAsync(async (req, res) => {
  const user = await contactService.createContact(req.body);
  res.status(httpStatus.CREATED).send(user);
});

const getUsers = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['name', 'role']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await userService.queryUsers(filter, options);
  res.send(result);
});

const getUser = catchAsync(async (req, res) => {
  const user = await userService.getUserById(req.params.userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  res.send(user);
});

const buyLand = catchAsync(async (req, res) => {
  const { landId, userId } = req.body;
  const user = await userService.getUserById(userId);
  const land = await landService.getLandByLandId(landId);

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  if (!land) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Land not found');
  }
  if (land.state !== 'Satılık') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Land is not available for purchase');
  }

  // Maksimum 5 arsa limiti
  const userLands = user.lands || [];
  if (userLands.length >= 5) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'En fazla 5 arsa satin alabilirsiniz.');
  }

  const userBalance = user.balance || 0;
  const landPrice = land.currentPrice || land.basePrice;

  if (userBalance < landPrice) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Insufficient balance');
  }

  const newBalance = userBalance - landPrice;
  const lastLands = user.lands || [];
  lastLands.push({ landId: land.landId, id: land.id });

  await userService.updateUserById(userId, {
    lands: lastLands,
    balance: newBalance,
  });

  const purchaseDate = new Date();
  const sellLockUntil = new Date(purchaseDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 gün kilit

  await landService.updateLandByLandId(landId, {
    state: 'Satıldı',
    owner: user.username,
    ownerId: user.id,
    purchaseDate,
    sellLockUntil,
  });

  res.send({ message: 'Land purchased successfully', landId: land.landId });
});

const addBalance = catchAsync(async (req, res) => {
  const { userId, amount } = req.body;
  const user = await userService.getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  const newBalance = (user.balance || 0) + amount;
  const updatedUser = await userService.updateUserById(userId, { balance: newBalance });
  res.send({ message: 'Balance added successfully', balance: updatedUser.balance });
});

const depositCrypto = catchAsync(async (req, res) => {
  const { txHash, fromWallet, amount } = req.body;
  const user = req.user;

  const payment = await paymentService.createPayment({
    userId: user.id,
    username: user.username,
    amount,
    txHash,
    fromWallet,
    toWallet: 'TWodEk82DpArzZDq4yR5mx5qaMaeEXkcAt',
    status: 'Beklemede',
    type: 'deposit',
  });

  res.status(httpStatus.CREATED).send(payment);
});

const confirmDeposit = catchAsync(async (req, res) => {
  const { paymentId } = req.params;
  const payment = await paymentService.getPaymentById(paymentId);

  if (!payment) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Payment not found');
  }
  if (payment.status !== 'Beklemede') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Payment is not pending');
  }

  const user = await userService.getUserById(payment.userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  const newBalance = (user.balance || 0) + payment.amount;
  await userService.updateUserById(payment.userId, { balance: newBalance });
  await paymentService.updatePaymentById(paymentId, { status: 'Onaylandı' });

  res.send({ message: 'Deposit confirmed', balance: newBalance });
});

const getPortfolio = catchAsync(async (req, res) => {
  const user = req.user;
  const userLands = user.lands || [];

  const portfolio = [];
  let totalCurrentValue = 0;
  let totalBaseValue = 0;

  for (const landRef of userLands) {
    const land = await landService.getLandByLandId(landRef.landId);
    if (land) {
      const currentValue = calculateCurrentPrice(land.basePrice, land.purchaseDate);
      totalCurrentValue += currentValue;
      totalBaseValue += land.basePrice;
      portfolio.push({
        landId: land.landId,
        basePrice: land.basePrice,
        currentPrice: parseFloat(currentValue.toFixed(2)),
        purchaseDate: land.purchaseDate,
        batch: land.batch,
      });
    }
  }

  res.send({
    totalLands: portfolio.length,
    totalBaseValue: parseFloat(totalBaseValue.toFixed(2)),
    totalCurrentValue: parseFloat(totalCurrentValue.toFixed(2)),
    totalProfit: parseFloat((totalCurrentValue - totalBaseValue).toFixed(2)),
    lands: portfolio,
  });
});

const getReferralInfo = catchAsync(async (req, res) => {
  const user = req.user;
  res.send({
    referralCode: user.referralCode,
    referralCount: user.referralCount,
    neededForFreeLand: 2 - user.referralCount,
  });
});

const getUsername = catchAsync(async (req, res) => {
  const user = await userService.getUserByUsername(req.params.username);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  user.id = undefined;
  user.isEmailVerified = undefined;
  user.role = undefined;
  user.phone = undefined;
  user.email = undefined;
  user.balance = undefined;

  res.send(user);
});

const updateUser = catchAsync(async (req, res) => {
  const updateBody = {
    name: req?.body?.name,
    surname: req?.body?.surname,
    password: req?.body?.password,
    description: req?.body?.description,
    avatar: req?.body?.avatar,
  };

  if (req.body.usdtWallet !== undefined) {
    updateBody.usdtWallet = req.body.usdtWallet;
  }

  // Remove undefined fields
  Object.keys(updateBody).forEach((key) => {
    if (updateBody[key] === undefined) {
      delete updateBody[key];
    }
  });

  const user = await userService.updateUserById(req.params.userId, updateBody);
  user.id = undefined;
  user.isEmailVerified = undefined;
  user.role = undefined;
  user.phone = undefined;
  user.email = undefined;
  user.balance = undefined;

  res.send(user);
});

const deleteUser = catchAsync(async (req, res) => {
  await userService.deleteUserById(req.params.userId);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createUser,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  getUsername,
  buyLand,
  createContact,
  addBalance,
  depositCrypto,
  confirmDeposit,
  getPortfolio,
  getReferralInfo,
};
