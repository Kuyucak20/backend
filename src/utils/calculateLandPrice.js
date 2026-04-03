/**
 * Arsa fiyat hesaplama
 * Ön satış dönemi (14 Nisan 2026'ya kadar): %2 artış YOK, sabit 249 USDT
 * 14 Nisan 2026'dan itibaren: günlük %2 bileşik artış
 */
const PRESALE_END = new Date('2026-04-14T00:00:00+03:00');
const BASE_PRICE = 249;
const DAILY_RATE = 0.02;

function calculateCurrentPrice(basePrice, purchaseDate) {
  const now = new Date();
  const price = basePrice || BASE_PRICE;

  // Ön satış dönemindeyiz - artış yok
  if (now < PRESALE_END) {
    return price;
  }

  // 14 Nisan'dan itibaren geçen gün sayısı
  const daysSincePresaleEnd = Math.floor((now - PRESALE_END) / (1000 * 60 * 60 * 24));
  return price * Math.pow(1 + DAILY_RATE, daysSincePresaleEnd);
}

function isPresaleActive() {
  return new Date() < PRESALE_END;
}

function getPresaleEndDate() {
  return PRESALE_END;
}

module.exports = calculateCurrentPrice;
module.exports.calculateCurrentPrice = calculateCurrentPrice;
module.exports.isPresaleActive = isPresaleActive;
module.exports.getPresaleEndDate = getPresaleEndDate;
module.exports.PRESALE_END = PRESALE_END;
module.exports.BASE_PRICE = BASE_PRICE;
