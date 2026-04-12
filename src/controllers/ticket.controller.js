const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { Ticket } = require('../models');

// Kullanici soru sorar
const createTicket = catchAsync(async (req, res) => {
  const user = req.user;
  const { question } = req.body;

  if (!question || question.trim().length === 0) {
    return res.status(httpStatus.BAD_REQUEST).send({ message: 'Soru bos olamaz' });
  }

  const ticket = await Ticket.create({
    userId: user.id,
    username: user.name + ' ' + (user.surname || ''),
    question: question.trim(),
  });

  res.status(httpStatus.CREATED).send(ticket);
});

// Kullanici kendi sorularini gorur
const getMyTickets = catchAsync(async (req, res) => {
  const user = req.user;
  const tickets = await Ticket.find({ userId: user.id }).sort({ createdAt: -1 });
  res.send(tickets);
});

// Kullanici okunmamis cevap var mi kontrol eder
const getUnreadCount = catchAsync(async (req, res) => {
  const user = req.user;
  const count = await Ticket.countDocuments({ userId: user.id, answer: { $ne: null }, isRead: false });
  res.send({ unreadCount: count });
});

// Kullanici cevabi okudugunda isRead = true yapar
const markAsRead = catchAsync(async (req, res) => {
  const user = req.user;
  await Ticket.updateMany({ userId: user.id, isRead: false, answer: { $ne: null } }, { $set: { isRead: true } });
  res.send({ message: 'Okundu olarak isaretlendi' });
});

// Admin: tum sorulari gor
const getAllTickets = catchAsync(async (req, res) => {
  const tickets = await Ticket.find().sort({ createdAt: -1 });
  res.send(tickets);
});

// Admin: cevap ver
const answerTicket = catchAsync(async (req, res) => {
  const { ticketId, answer } = req.body;

  if (!answer || answer.trim().length === 0) {
    return res.status(httpStatus.BAD_REQUEST).send({ message: 'Cevap bos olamaz' });
  }

  const ticket = await Ticket.findById(ticketId);
  if (!ticket) {
    return res.status(httpStatus.NOT_FOUND).send({ message: 'Soru bulunamadi' });
  }

  ticket.answer = answer.trim();
  ticket.answeredAt = new Date();
  ticket.isRead = false;
  await ticket.save();

  res.send(ticket);
});

module.exports = {
  createTicket,
  getMyTickets,
  getUnreadCount,
  markAsRead,
  getAllTickets,
  answerTicket,
};
