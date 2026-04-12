const express = require('express');
const authRoute = require('./auth.route');
const userRoute = require('./user.route');
const docsRoute = require('./docs.route');
const landRoute = require('./land.route');
const publicRoute = require('./public.route');
const paymentRoute = require('./payment.route');
const settingsRoute = require('./settings.route');
const activityRoute = require('./activity.route');
const ticketRoute = require('./ticket.route');
const config = require('../../config/config');

const router = express.Router();

const defaultRoutes = [
  {
    path: '/auth',
    route: authRoute,
  },
  {
    path: '/users',
    route: userRoute,
  },
  {
    path: '/public',
    route: publicRoute,
  },
  {
    path: '/land',
    route: landRoute,
  },
  {
    path: '/payment',
    route: paymentRoute,
  },
  {
    path: '/settings',
    route: settingsRoute,
  },
  {
    path: '/activity',
    route: activityRoute,
  },
  {
    path: '/tickets',
    route: ticketRoute,
  },
];

const devRoutes = [
  // routes available only in development mode
  {
    path: '/docs',
    route: docsRoute,
  },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

/* istanbul ignore next */
if (config.env === 'development') {
  devRoutes.forEach((route) => {
    router.use(route.path, route.route);
  });
}

module.exports = router;
