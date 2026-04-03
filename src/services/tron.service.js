const axios = require('axios');
const logger = require('../config/logger');
const { Payment, User } = require('../models');

const WALLET_ADDRESS = 'TWodEk82DpArzZDq4yR5mx5qaMaeEXkcAt';
const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const TRONGRID_URL = `https://api.trongrid.io/v1/accounts/${WALLET_ADDRESS}/transactions/trc20`;
const POLL_INTERVAL = 30000; // 30 saniye

let lastCheckedTimestamp = Date.now();

const checkTransactions = async () => {
  try {
    const pendingPayments = await Payment.find({
      status: 'Beklemede',
      type: 'deposit',
    });

    if (pendingPayments.length === 0) return;

    // Süresi dolmuş ödemeleri işaretle (30 dakika)
    const now = new Date();
    for (const payment of pendingPayments) {
      if (payment.expiresAt && now > payment.expiresAt) {
        payment.status = 'Suresi Doldu';
        await payment.save();
        logger.info(`Payment expired: ${payment.id} - ${payment.uniqueAmount} USDT`);
      }
    }

    // Aktif bekleyen ödemeleri al
    const activePending = pendingPayments.filter(
      (p) => !p.expiresAt || now <= p.expiresAt
    );
    if (activePending.length === 0) return;

    // TronGrid'den son işlemleri çek
    const response = await axios.get(TRONGRID_URL, {
      params: {
        only_to: true,
        limit: 50,
        min_timestamp: lastCheckedTimestamp - 60000, // 1 dakika geriye bak
        contract_address: USDT_CONTRACT,
      },
    });

    const transactions = response.data?.data || [];

    for (const tx of transactions) {
      if (tx.to !== WALLET_ADDRESS) continue;

      // USDT 6 decimal
      const txAmount = parseFloat(tx.value) / 1e6;

      // Benzersiz tutar ile eşleştir
      for (const payment of activePending) {
        if (payment.status !== 'Beklemede') continue;

        // Tutarları karşılaştır (0.01 tolerans)
        if (Math.abs(txAmount - payment.uniqueAmount) < 0.01) {
          // Eşleşme bulundu - otomatik onayla
          payment.status = 'Onaylandı';
          payment.txHash = tx.transaction_id;
          payment.fromWallet = tx.from;
          await payment.save();

          // Kullanıcı bakiyesini güncelle
          const user = await User.findById(payment.userId);
          if (user) {
            user.balance = (user.balance || 0) + payment.amount;
            await user.save();
            logger.info(
              `Auto-confirmed payment: ${payment.id} - ${payment.amount} USDT for user ${user.username} (tx: ${tx.transaction_id})`
            );
          }
          break;
        }
      }
    }

    lastCheckedTimestamp = Date.now();
  } catch (error) {
    logger.error(`TronGrid polling error: ${error.message}`);
  }
};

const generateUniqueAmount = async (baseAmount) => {
  // Benzersiz kuruş ekle (0.01 - 0.99 arası random)
  let attempts = 0;
  while (attempts < 100) {
    const cents = Math.floor(Math.random() * 99) + 1;
    const uniqueAmount = parseFloat((Math.floor(baseAmount) + cents / 100).toFixed(2));

    // Bu tutar zaten bekleyen bir ödemede var mı kontrol et
    const existing = await Payment.findOne({
      uniqueAmount,
      status: 'Beklemede',
    });

    if (!existing) {
      return uniqueAmount;
    }
    attempts++;
  }
  // Fallback: 3 decimal ile dene
  const cents = Math.floor(Math.random() * 999) + 1;
  return parseFloat((Math.floor(baseAmount) + cents / 1000).toFixed(3));
};

const startPolling = () => {
  logger.info('TronGrid polling started - checking every 30 seconds');
  setInterval(checkTransactions, POLL_INTERVAL);
  // İlk kontrolü hemen yap
  checkTransactions();
};

module.exports = {
  checkTransactions,
  generateUniqueAmount,
  startPolling,
};
