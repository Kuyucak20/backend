const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const calculateCurrentPrice = require('../utils/calculateLandPrice');
const { userService, landService, contactService, paymentService, nftService } = require('../services');

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

  // Kullanicinin arsalarini Land modelinden zenginlestir
  const userObj = user.toObject ? user.toObject() : { ...user };
  if (userObj.lands && userObj.lands.length > 0) {
    const { Land } = require('../models');
    const enrichedLands = await Promise.all(
      userObj.lands.map(async (landRef) => {
        // Hem landId hem id ile ara (eski kayitlarda landId olmayabilir)
        let landData = null;
        if (landRef.landId) {
          landData = await Land.findOne({ landId: landRef.landId });
        }
        if (!landData && landRef.id) {
          landData = await Land.findById(landRef.id).catch(() => null);
        }
        if (!landData && landRef._id) {
          landData = await Land.findById(landRef._id).catch(() => null);
        }

        if (landData) {
          const currentPrice = calculateCurrentPrice(landData.basePrice || 249, landData.purchaseDate);
          return {
            landId: landData.landId || landRef.landId,
            id: landData._id || landRef.id,
            price: landData.basePrice || 249,
            purchaseDate: landData.purchaseDate,
            currentPrice,
            island: landData.island || null,
            nftTokenId: landData.nftTokenId || null,
            listedForSale: landData.listedForSale || false,
            salePrice: landData.salePrice || null,
            sellLockUntil: landData.sellLockUntil || null,
            isReferralReward: landData.isReferralReward || false,
          };
        }
        return landRef;
      })
    );
    userObj.lands = enrichedLands;
  }

  res.send(userObj);
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
  const sellLockUntil = new Date(purchaseDate.getTime() + 1 * 24 * 60 * 60 * 1000); // 1 gun kilit

  await landService.updateLandByLandId(landId, {
    state: 'Satıldı',
    owner: user.username,
    ownerId: user.id,
    purchaseDate,
    sellLockUntil,
  });

  // NFT mint et
  if (user.bnbWallet && user.bnbWallet.address) {
    try {
      const { tokenId, txHash } = await nftService.mintNFT(user.bnbWallet.address, landId);
      if (tokenId) {
        await landService.updateLandByLandId(landId, { nftTokenId: tokenId, nftTxHash: txHash });
      }
    } catch (nftError) {
      console.error(`NFT mint failed for ${landId}: ${nftError.message}`);
    }
  }

  // Referans sistemi: kullanicinin ilk arsasi ise ve referredBy varsa
  // davet edenin referralCount'unu artir
  if (lastLands.length === 1 && user.referredBy) {
    const referrer = await userService.getUserByReferralCode(user.referredBy);
    if (referrer) {
      const newCount = (referrer.referralCount || 0) + 1;

      if (newCount >= 2) {
        // 2 kisi arsa aldi -> davet edene ucretsiz arsa ver (3 ay kilitli)
        const { Land } = require('../models');
        const freeLand = await Land.findOne({ state: 'Satılık' }).sort({ landId: 1 });

        if (freeLand) {
          const rewardDate = new Date();
          const rewardLockUntil = new Date(rewardDate.getTime() + 90 * 24 * 60 * 60 * 1000); // 3 ay kilit

          const referrerLands = referrer.lands || [];
          referrerLands.push({ landId: freeLand.landId, id: freeLand.id });

          await userService.updateUserById(referrer.id, {
            referralCount: 0,
            lands: referrerLands,
          });

          await landService.updateLandByLandId(freeLand.landId, {
            state: 'Satıldı',
            owner: referrer.username,
            ownerId: referrer.id,
            purchaseDate: rewardDate,
            sellLockUntil: rewardLockUntil,
            isReferralReward: true,
          });

          // Referral arsasina NFT mint
          if (referrer.bnbWallet && referrer.bnbWallet.address) {
            try {
              const { tokenId: rTokenId, txHash: rTxHash } = await nftService.mintNFT(referrer.bnbWallet.address, freeLand.landId);
              if (rTokenId) {
                await landService.updateLandByLandId(freeLand.landId, { nftTokenId: rTokenId, nftTxHash: rTxHash });
              }
            } catch (nftErr) {
              console.error(`Referral NFT mint failed: ${nftErr.message}`);
            }
          }
        }
      } else {
        await userService.updateUserById(referrer.id, {
          referralCount: newCount,
        });
      }
    }
  }

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
    toWallet: 'TCjrwQ3jpxbZSbG9hJTfe1EhS9JAWym9ra',
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
    neededForReward: Math.max(0, 2 - (user.referralCount || 0)),
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

// Arsayi satisa cikar (kullanici kendi arsasini listeliyor)
const listLandForSale = catchAsync(async (req, res) => {
  const { landId } = req.body;
  const user = req.user;
  const land = await landService.getLandByLandId(landId);

  if (!land) throw new ApiError(httpStatus.NOT_FOUND, 'Arsa bulunamadi');
  if (land.ownerId !== user.id) throw new ApiError(httpStatus.FORBIDDEN, 'Bu arsa size ait degil');
  if (land.listedForSale) throw new ApiError(httpStatus.BAD_REQUEST, 'Arsa zaten satista');

  // Satis kilidi: sellLockUntil varsa ona bak, yoksa satin alma tarihinden 1 gun
  if (land.sellLockUntil && new Date(land.sellLockUntil).getTime() > Date.now()) {
    const kalan = Math.ceil((new Date(land.sellLockUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    throw new ApiError(httpStatus.BAD_REQUEST, `Bu arsayi satabilmek icin ${kalan} gun beklemeniz gerekiyor`);
  }
  const SELL_COOLDOWN = 24 * 60 * 60 * 1000; // 1 gun
  if (!land.sellLockUntil && land.purchaseDate && (Date.now() - new Date(land.purchaseDate).getTime()) < SELL_COOLDOWN) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Arsayi satin aldiktan sonra 1 gun beklemeniz gerekiyor');
  }

  // Guncel deger hesapla (gunluk %2 bilesik artis)
  const currentValue = calculateCurrentPrice(land.basePrice || 249, land.purchaseDate);
  // Satis fiyati: guncel deger (zaten %2 gunluk artis iceriyor)
  const salePrice = parseFloat(currentValue.toFixed(2));

  await landService.updateLandByLandId(landId, {
    listedForSale: true,
    salePrice,
    listedAt: new Date(),
  });

  res.send({ message: 'Arsa satisa cikarildi', landId, salePrice });
});

// Satisa cikan arsayi geri cek
const cancelListing = catchAsync(async (req, res) => {
  const { landId } = req.body;
  const user = req.user;
  const land = await landService.getLandByLandId(landId);

  if (!land) throw new ApiError(httpStatus.NOT_FOUND, 'Arsa bulunamadi');
  if (land.ownerId !== user.id) throw new ApiError(httpStatus.FORBIDDEN, 'Bu arsa size ait degil');

  await landService.updateLandByLandId(landId, {
    listedForSale: false,
    salePrice: null,
    listedAt: null,
  });

  res.send({ message: 'Arsa satistan cekildi', landId });
});

// Baska kullanicinin satistaki arsasini satin al
const buyListedLand = catchAsync(async (req, res) => {
  const { landId } = req.body;
  const buyer = req.user;
  const land = await landService.getLandByLandId(landId);

  if (!land) throw new ApiError(httpStatus.NOT_FOUND, 'Arsa bulunamadi');
  if (!land.listedForSale) throw new ApiError(httpStatus.BAD_REQUEST, 'Bu arsa satista degil');
  if (land.ownerId === buyer.id) throw new ApiError(httpStatus.BAD_REQUEST, 'Kendi arsanizi satin alamazsiniz');

  // Maks 5 arsa kontrolu
  const buyerLands = buyer.lands || [];
  if (buyerLands.length >= 5) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'En fazla 5 arsa sahibi olabilirsiniz');
  }

  const salePrice = land.salePrice;
  if ((buyer.balance || 0) < salePrice) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Yetersiz bakiye');
  }

  const seller = await userService.getUserById(land.ownerId);
  if (!seller) throw new ApiError(httpStatus.NOT_FOUND, 'Satici bulunamadi');

  // Alici: bakiye dus, arsa ekle
  await userService.updateUserById(buyer.id, {
    balance: (buyer.balance || 0) - salePrice,
    lands: [...buyerLands, { landId: land.landId, id: land.id }],
  });

  // Satici: bakiye ekle, arsa cikar
  const sellerLands = (seller.lands || []).filter((l) => l.landId !== landId);
  await userService.updateUserById(seller.id, {
    balance: (seller.balance || 0) + salePrice,
    lands: sellerLands,
  });

  // Arsa guncelle
  const purchaseDate = new Date();
  await landService.updateLandByLandId(landId, {
    owner: buyer.username,
    ownerId: buyer.id,
    currentPrice: salePrice,
    purchaseDate,
    sellLockUntil: null,
    listedForSale: false,
    salePrice: null,
    listedAt: null,
  });

  // Satis gecmisi kaydi
  try {
    const { SaleHistory } = require('../models');
    const basePrice = land.basePrice || 249;
    const profit = salePrice - basePrice;
    const profitPercent = parseFloat(((profit / basePrice) * 100).toFixed(1));
    await SaleHistory.create({
      landId: land.landId,
      island: land.island || null,
      nftTokenId: land.nftTokenId || null,
      sellerName: seller.name + ' ' + (seller.surname || ''),
      buyerName: buyer.name + ' ' + (buyer.surname || ''),
      basePrice,
      salePrice,
      profit,
      profitPercent,
      soldAt: new Date(),
    });
  } catch (histErr) {
    console.error('Sale history save failed:', histErr.message);
  }

  // NFT transfer
  if (land.nftTokenId && seller.bnbWallet?.address && buyer.bnbWallet?.address) {
    try {
      await nftService.transferNFT(seller.bnbWallet.address, buyer.bnbWallet.address, land.nftTokenId);
    } catch (nftError) {
      console.error(`NFT transfer failed: ${nftError.message}`);
    }
  }

  res.send({ message: 'Arsa basariyla satin alindi', landId, salePrice });
});

// NFT yi dis cuzdana transfer et
const transferNFTExternal = catchAsync(async (req, res) => {
  const { landId, toAddress } = req.body;
  const user = req.user;
  const land = await landService.getLandByLandId(landId);

  if (!land) throw new ApiError(httpStatus.NOT_FOUND, 'Arsa bulunamadi');
  if (land.ownerId !== user.id) throw new ApiError(httpStatus.FORBIDDEN, 'Bu arsa size ait degil');
  if (!land.nftTokenId) throw new ApiError(httpStatus.BAD_REQUEST, 'Bu arsanin NFT si henuz olusturulmamis');

  const { ethers } = require('ethers');
  if (!ethers.isAddress(toAddress)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Gecersiz BNB adresi');
  }

  const { txHash } = await nftService.transferNFT(user.bnbWallet.address, toAddress, land.nftTokenId);
  res.send({ message: 'NFT basariyla transfer edildi', txHash, landId });
});

// Para cekme istegi olustur
const requestWithdrawal = catchAsync(async (req, res) => {
  const { amount, toWallet, walletType } = req.body;
  const user = req.user;

  if (!amount || amount <= 0) throw new ApiError(httpStatus.BAD_REQUEST, 'Gecerli bir tutar girin');
  if (!toWallet) throw new ApiError(httpStatus.BAD_REQUEST, 'Cuzdan adresi gerekli');
  if ((user.balance || 0) < amount) throw new ApiError(httpStatus.BAD_REQUEST, 'Yetersiz bakiye');

  const { Withdrawal } = require('../models');

  // Bekleyen istek var mi?
  const pending = await Withdrawal.findOne({ userId: user.id, status: 'Beklemede' });
  if (pending) throw new ApiError(httpStatus.BAD_REQUEST, 'Zaten bekleyen bir cekme isteginiz var');

  // Bakiyeden dus
  await userService.updateUserById(user.id, { balance: (user.balance || 0) - amount });

  const withdrawal = await Withdrawal.create({
    userId: user.id,
    username: user.username,
    amount,
    toWallet,
    walletType: walletType || 'USDT_TRC20',
    status: 'Beklemede',
  });

  res.status(httpStatus.CREATED).send({ message: 'Cekme istegi olusturuldu', withdrawal });
});

// Kullanicinin cekme isteklerini getir
const getMyWithdrawals = catchAsync(async (req, res) => {
  const user = req.user;
  const { Withdrawal } = require('../models');
  const withdrawals = await Withdrawal.find({ userId: user.id }).sort({ createdAt: -1 });
  res.send(withdrawals);
});

// Admin: Tum cekme isteklerini getir
const getAllWithdrawals = catchAsync(async (req, res) => {
  const { Withdrawal } = require('../models');
  const withdrawals = await Withdrawal.find({}).sort({ createdAt: -1 });
  res.send(withdrawals);
});

// Admin: Cekme istegini onayla/reddet
const processWithdrawal = catchAsync(async (req, res) => {
  const { withdrawalId } = req.params;
  const { action, adminNote, txHash } = req.body; // action: 'approve' | 'reject'
  const { Withdrawal } = require('../models');

  const withdrawal = await Withdrawal.findById(withdrawalId);
  if (!withdrawal) throw new ApiError(httpStatus.NOT_FOUND, 'Istek bulunamadi');
  if (withdrawal.status !== 'Beklemede') throw new ApiError(httpStatus.BAD_REQUEST, 'Bu istek zaten islendi');

  if (action === 'approve') {
    withdrawal.status = 'Onaylandı';
    withdrawal.txHash = txHash || null;
  } else if (action === 'reject') {
    withdrawal.status = 'Reddedildi';
    // Bakiyeyi geri ver
    const user = await userService.getUserById(withdrawal.userId);
    if (user) {
      await userService.updateUserById(withdrawal.userId, { balance: (user.balance || 0) + withdrawal.amount });
    }
  }
  withdrawal.adminNote = adminNote || '';
  await withdrawal.save();

  res.send({ message: `Istek ${action === 'approve' ? 'onaylandi' : 'reddedildi'}`, withdrawal });
});

// Mevcut kullanicilara BNB cuzdan olustur (migration)
const generateMissingWallets = catchAsync(async (req, res) => {
  const { User } = require('../models');
  const users = await User.find({ $or: [{ 'bnbWallet.address': '' }, { 'bnbWallet.address': { $exists: false } }, { bnbWallet: { $exists: false } }] });

  let count = 0;
  for (const user of users) {
    const wallet = nftService.createWallet();
    user.bnbWallet = wallet;
    await user.save();
    count++;
  }

  res.send({ message: `${count} kullaniciya BNB cuzdan olusturuldu` });
});

// Mevcut satilmis arsalara NFT mint et (migration)
const mintMissingNFTs = catchAsync(async (req, res) => {
  const { Land, User } = require('../models');
  const soldLands = await Land.find({ state: 'Satıldı', $or: [{ nftTokenId: null }, { nftTokenId: { $exists: false } }] });

  let minted = 0;
  let failed = 0;
  const results = [];

  for (const land of soldLands) {
    try {
      const user = await User.findById(land.ownerId);
      if (!user || !user.bnbWallet || !user.bnbWallet.address) {
        results.push({ landId: land.landId, status: 'skip', reason: 'no wallet' });
        continue;
      }

      const { tokenId, txHash } = await nftService.mintNFT(user.bnbWallet.address, land.landId);
      if (tokenId) {
        land.nftTokenId = tokenId;
        land.nftTxHash = txHash;
        await land.save();
        minted++;
        results.push({ landId: land.landId, tokenId, status: 'ok' });
      } else {
        failed++;
        results.push({ landId: land.landId, status: 'fail', reason: 'no tokenId' });
      }
    } catch (err) {
      failed++;
      results.push({ landId: land.landId, status: 'fail', reason: err.message });
    }
  }

  res.send({ message: `${minted} arsa mint edildi, ${failed} basarisiz`, total: soldLands.length, results });
});

// Satistaki arsalari listele
const getListedLands = catchAsync(async (req, res) => {
  const { Land } = require('../models');
  const lands = await Land.find({ listedForSale: true }).sort({ listedAt: -1 });
  res.send(lands);
});

// Mevcut satilmis arsalarin sellLockUntil degerini guncelle
const updateSellLocks = catchAsync(async (req, res) => {
  const { Land } = require('../models');
  const oneWeekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const result = await Land.updateMany(
    { state: 'Satıldı', isReferralReward: { $ne: true } },
    { $set: { sellLockUntil: oneWeekFromNow } }
  );

  res.send({
    message: `${result.modifiedCount} arsanin satis kilidi 1 hafta sonrasina guncellendi`,
    newSellLockUntil: oneWeekFromNow,
  });
});

module.exports = {
  createUser,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  getUsername,
  buyLand,
  listLandForSale,
  cancelListing,
  buyListedLand,
  transferNFTExternal,
  requestWithdrawal,
  getMyWithdrawals,
  getAllWithdrawals,
  processWithdrawal,
  generateMissingWallets,
  mintMissingNFTs,
  updateSellLocks,
  getListedLands,
  createContact,
  addBalance,
  depositCrypto,
  confirmDeposit,
  getPortfolio,
  getReferralInfo,
};
