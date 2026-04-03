const httpStatus = require('http-status');
const { Land } = require('../models');
const ApiError = require('../utils/ApiError');

const createLand = async (landBody) => {
  return Land.create(landBody);
};

const getLandByPosition = async (position) => {
  return Land.find({ position });
};

const getLandByLandId = async (landId) => {
  return Land.findOne({ landId });
};

const getLand = async () => {
  return Land.find({});
};

const getLandByState = async (state) => {
  return Land.findOne({ state });
};

const getAvailableLands = async (batch, page, limit) => {
  const filter = { state: 'Satılık' };
  if (batch) {
    filter.batch = batch;
  }
  const options = {
    page: page || 1,
    limit: limit || 20,
    sortBy: 'landId:asc',
  };
  return Land.paginate(filter, options);
};

const updateLandByPosition = async (position, updateBody) => {
  const land = await getLandByPosition(position);
  if (!land) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Land not found');
  }
  Object.assign(land[0], updateBody);
  await land[0].save();
  return land[0];
};

const updateLandByLandId = async (landId, updateBody) => {
  const land = await getLandByLandId(landId);
  if (!land) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Land not found');
  }
  Object.assign(land, updateBody);
  await land.save();
  return land;
};

/**
 * Yeni arsa sistemi: 2 ada, toplam 2000 arsa
 * Nova Adası: N1 - N1000 (25 satır x 40 sütun)
 * Atlas Adası: T1 - T1000 (25 satır x 40 sütun)
 */
const initializeNewLands = async () => {
  // Mevcut arsaları temizle
  await Land.deleteMany({});

  const lands = [];
  const islands = [
    { prefix: 'N', name: 'Nova Adası', batch: 1 },
    { prefix: 'T', name: 'Atlas Adası', batch: 2 },
  ];

  const cols = 40;
  const rows = 25;

  for (const island of islands) {
    let count = 1;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        lands.push({
          landId: `${island.prefix}${count}`,
          island: island.name,
          owner: 'GelecekArsa',
          ownerId: null,
          basePrice: 249,
          currentPrice: 249,
          purchaseDate: null,
          state: 'Satılık',
          batch: island.batch,
          row: r,
          col: c,
          position: null,
        });
        count++;
      }
    }
  }

  await Land.insertMany(lands);
  return { message: `${lands.length} arsa olusturuldu (Nova: 1000, Atlas: 1000)` };
};

// Eski initialization (geriye uyumluluk)
const initializeLands = async () => {
  return initializeNewLands();
};

module.exports = {
  createLand,
  getLand,
  getLandByPosition,
  getLandByLandId,
  getLandByState,
  getAvailableLands,
  updateLandByPosition,
  updateLandByLandId,
  initializeLands,
  initializeNewLands,
};
