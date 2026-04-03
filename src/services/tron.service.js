const axios = require('axios');
const logger = require('../config/logger');
const { Payment, User } = require('../models');

const WALLET_ADDRESS = 'TWodEk82DpArzZDq4yR5mx5qaMaeEXkcAt';
const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const TRONGRID_URL = `https://api.trongrid.io/v1/accounts/${WALLET_ADDRESS}/transactions/trc20`;
const POLL_INTERVAL = 20000; // 20 saniye

// Son işlenen transaction ID'lerini tut (tekrar işlemeyi önle)
const processedTxIds = new Set();

const checkTransactions = async () => {
  try {
    const pendingPayments = await Payment.find({
      status: 'Beklemede',
      type: 'deposit',
    });

    if (pendingPayments.length === 0) return;

    // Süresi dolmuş ödemeleri işaretle (2 saat)
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
      (p) => p.status === 'Beklemede' && (!p.expiresAt || now <= p.expiresAt)
    );
    if (activePending.length === 0) return;

    logger.info(`Checking TronGrid... ${activePending.length} pending payment(s). Amounts: [${activePending.map(p => p.uniqueAmount).join(', ')}]`);

    // TronGrid'den SON işlemleri çek - min_timestamp KULLANMA, son 50 işlemi al
    const response = await axios.get(TRONGRID_URL, {
      params: {
        only_to: true,
        limit: 50,
        contract_address: USDT_CONTRACT,
      },
      timeout: 10000,
    });

    const transactions = response.data?.data || [];
    logger.info(`TronGrid returned ${transactions.length} transaction(s)`);

    for (const tx of transactions) {
      // Bu işlemi daha önce işledik mi?
      if (processedTxIds.has(tx.transaction_id)) continue;
      if (tx.to !== WALLET_ADDRESS) continue;

      // USDT 6 decimal
      const txAmount = parseFloat(tx.value) / 1e6;

      // Benzersiz tutar ile eşleştir
      for (const payment of activePending) {
        if (payment.status !== 'Beklemede') continue;

        // Tutarları karşılaştır (0.001 tolerans - kuruş hassasiyeti)
        const diff = Math.abs(txAmount - payment.uniqueAmount);
        if (diff < 0.01) {
          logger.info(`MATCH FOUND! TxAmount: ${txAmount}, PaymentAmount: ${payment.uniqueAmount}, Diff: ${diff}`);

          // Eşleşme bulundu - otomatik onayla
          payment.status = 'Onaylandı';
          payment.txHash = tx.transaction_id;
          payment.fromWallet = tx.from;
          await payment.save();

          // İşlenmiş olarak işaretle
          processedTxIds.add(tx.transaction_id);

          // Kullanıcı bakiyesini güncelle
          const user = await User.findById(payment.userId);
          if (user) {
            user.balance = (user.balance || 0) + payment.amount;
            await user.save();
            logger.info(
              `AUTO-CONFIRMED: ${payment.amount} USDT for user ${user.username} (tx: ${tx.transaction_id})`
            );
          }
          break;
        }
      }
    }
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
  logger.info('TronGrid polling started - checking every 20 seconds');
  setInterval(checkTransactions, POLL_INTERVAL);
  // İlk kontrolü 5 saniye sonra yap (DB bağlantısı settle olsun)
  setTimeout(checkTransactions, 5000);
};

module.exports = {
  checkTransactions,
  generateUniqueAmount,
  startPolling,
};
