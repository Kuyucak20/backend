const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const calculateCurrentPrice = require('../utils/calculateLandPrice');
const { landService } = require('../services');

const createLand = catchAsync(async (req, res) => {
  const land = await landService.createLand(req.body);
  res.status(httpStatus.CREATED).send(land);
});

const getLand = catchAsync(async (req, res) => {
  const land = await landService.getLand(req.body);
  res.send(land);
});

const getPositionLand = catchAsync(async (req, res) => {
  const land = await landService.getLandByLandId(req.params.id);
  if (!land) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Land not found');
  }
  res.send(land);
});

const initializeLands = catchAsync(async (req, res) => {
  const result = await landService.initializeLands();
  res.status(httpStatus.CREATED).send(result);
});

const getAvailableLands = catchAsync(async (req, res) => {
  const { batch, page, limit } = req.query;
  const result = await landService.getAvailableLands(
    batch ? parseInt(batch, 10) : undefined,
    page ? parseInt(page, 10) : 1,
    limit ? parseInt(limit, 10) : 20
  );
  res.send(result);
});

const getLandValue = catchAsync(async (req, res) => {
  const land = await landService.getLandByLandId(req.params.id);
  if (!land) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Land not found');
  }

  const currentValue = calculateCurrentPrice(land.basePrice, land.purchaseDate);
  res.send({
    landId: land.landId,
    basePrice: land.basePrice,
    currentPrice: parseFloat(currentValue.toFixed(2)),
    purchaseDate: land.purchaseDate,
    owner: land.owner,
    state: land.state,
  });
});

const initializeNewLands = catchAsync(async (req, res) => {
  const result = await landService.initializeNewLands();
  res.status(httpStatus.CREATED).send(result);
});

// Mevcut arsalara landId ata (A1, A2... satır harfi + sütun no)
const assignLandIds = catchAsync(async (req, res) => {
  const { Land } = require('../models');
  const allLands = await Land.find({});

  // Grid koordinatlarını çıkar
  const landsWithCoords = allLands.map((land) => {
    const pos = land.position || '';
    const match = pos.match(/^M([\d.]+),([\d.]+)/);
    if (!match) return null;
    return { land, x: parseFloat(match[1]), y: parseFloat(match[2]) };
  }).filter(Boolean);

  // Benzersiz X ve Y değerlerini sırala
  const uniqueX = [...new Set(landsWithCoords.map((l) => l.x))].sort((a, b) => a - b);
  const uniqueY = [...new Set(landsWithCoords.map((l) => l.y))].sort((a, b) => a - b);

  // Satır harfleri: A, B, C, ..., Z, AA, AB, ...
  const getRowLabel = (idx) => {
    let label = '';
    let n = idx;
    do {
      label = String.fromCharCode(65 + (n % 26)) + label;
      n = Math.floor(n / 26) - 1;
    } while (n >= 0);
    return label;
  };

  let updated = 0;
  for (const item of landsWithCoords) {
    const col = uniqueX.indexOf(item.x) + 1;
    const row = uniqueY.indexOf(item.y);
    const landId = `${getRowLabel(row)}${col}`;
    item.land.landId = landId;
    await item.land.save();
    updated++;
  }

  res.send({ message: `${updated} arsa guncellendi`, totalRows: uniqueY.length, totalCols: uniqueX.length });
});

module.exports = {
  createLand,
  getLand,
  getPositionLand,
  initializeLands,
  getAvailableLands,
  getLandValue,
  assignLandIds,
  initializeNewLands,
};
