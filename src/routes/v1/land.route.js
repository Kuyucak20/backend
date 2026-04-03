const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const landValidation = require('../../validations/land.validation');
const { landController } = require('../../controllers');

const router = express.Router();

router
  .route('/add')
  .post(auth('manageUsers'), validate(landValidation.createLand), landController.createLand);

router
  .route('/initialize')
  .post(auth('manageUsers'), validate(landValidation.initializeLands), landController.initializeLands);

router
  .route('/available')
  .get(validate(landValidation.getAvailableLands), landController.getAvailableLands);

router
  .route('/value/:id')
  .get(validate(landValidation.getLandValue), landController.getLandValue);

router
  .route('/get/:id')
  .get(validate(landValidation.getPositionLand), landController.getPositionLand);

router
  .route('/get')
  .get(validate(landValidation.getLand), landController.getLand);

router
  .route('/assign-ids')
  .post(landController.assignLandIds);

router
  .route('/initialize-new')
  .post(landController.initializeNewLands);

module.exports = router;
