const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const userValidation = require('../../validations/user.validation');
const userController = require('../../controllers/user.controller');

const router = express.Router();

router
  .route('/update')
  .post(auth('user'), validate(userValidation.updateUser), userController.updateUser)
  .get(auth('getUsers'), validate(userValidation.getUsers), userController.getUsers);

router
  .route('/buyland')
  .post(auth('getUsers'), validate(userValidation.buyLand), userController.buyLand);

router
  .route('/portfolio')
  .post(auth('getUsers'), validate(userValidation.getPortfolio), userController.getPortfolio);

router
  .route('/referral')
  .get(auth('getUsers'), validate(userValidation.getReferralInfo), userController.getReferralInfo);

router
  .route('/deposit')
  .post(auth('getUsers'), validate(userValidation.depositCrypto), userController.depositCrypto);

router
  .route('/confirm-deposit/:paymentId')
  .post(auth('manageUsers'), validate(userValidation.confirmDeposit), userController.confirmDeposit);

router
  .route('/add-balance')
  .post(auth('manageUsers'), validate(userValidation.addBalance), userController.addBalance);

router
  .route('/:userId')
  .get(auth('getUsers'), validate(userValidation.getUser), userController.getUser)
  .patch(auth('manageUsers'), validate(userValidation.updateUser), userController.updateUser)
  .delete(auth('manageUsers'), validate(userValidation.deleteUser), userController.deleteUser);

module.exports = router;
