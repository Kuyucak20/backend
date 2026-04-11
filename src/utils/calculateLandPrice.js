/**
 * Arsa fiyat hesaplama
 * Satin alinan arsalar her gun %2 bilesik deger artisi kazanir
 * Ornek: 249 * 1.02^gun = guncel deger
 */
const BASE_PRICE = 249;
const DAILY_RATE = 0.02; // %2 gunluk artis

function calculateCurrentPrice(basePrice, purchaseDate) {
  const base = basePrice || BASE_PRICE;
  if (!purchaseDate) return base;

  const now = new Date();
  const purchase = new Date(purchaseDate);
  const diffMs = now.getTime() - purchase.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (days <= 0) return base;

  // Bilesik artis: basePrice * (1 + 0.02)^gun
  const currentPrice = parseFloat((base * Math.pow(1 + DAILY_RATE, days)).toFixed(2));
  return currentPrice;
}

function getDaysSincePurchase(purchaseDate) {
  if (!purchaseDate) return 0;
  const now = new Date();
  const purchase = new Date(purchaseDate);
  const diffMs = now.getTime() - purchase.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

function isPresaleActive() {
  return false;
}

function getPresaleEndDate() {
  return null;
}

module.exports = calculateCurrentPrice;
module.exports.calculateCurrentPrice = calculateCurrentPrice;
module.exports.getDaysSincePurchase = getDaysSincePurchase;
module.exports.isPresaleActive = isPresaleActive;
module.exports.getPresaleEndDate = getPresaleEndDate;
module.exports.BASE_PRICE = BASE_PRICE;
module.exports.DAILY_RATE = DAILY_RATE;
