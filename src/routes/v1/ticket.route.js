const express = require('express');
const auth = require('../../middlewares/auth');
const ticketController = require('../../controllers/ticket.controller');

const router = express.Router();

// Kullanici endpointleri
router.post('/create', auth('getUsers'), ticketController.createTicket);
router.get('/my-tickets', auth('getUsers'), ticketController.getMyTickets);
router.get('/unread-count', auth('getUsers'), ticketController.getUnreadCount);
router.post('/mark-read', auth('getUsers'), ticketController.markAsRead);

// Admin endpointleri
router.get('/all', ticketController.getAllTickets);
router.post('/answer', ticketController.answerTicket);

module.exports = router;
