const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const ticketSchema = mongoose.Schema(
  {
    userId: { type: String, required: true },
    username: { type: String, required: true },
    question: { type: String, required: true },
    answer: { type: String, default: null },
    answeredAt: { type: Date, default: null },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

ticketSchema.plugin(toJSON);
ticketSchema.plugin(paginate);

const Ticket = mongoose.model('Ticket', ticketSchema);
module.exports = Ticket;
