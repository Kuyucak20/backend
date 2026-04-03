const { Contact } = require("../models");

const createContact = async (userBody) => {
  return Contact.create(userBody);
};

module.exports = {
  createContact,
};
