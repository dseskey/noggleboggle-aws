const mongoose = require('mongoose');
const validator = require('validator');

const model = mongoose.model('User', {
  firstName: {
    type: String,
    required: true,
    validate: {
      validator(firstName) {
        return validator.isAlphanumeric(firstName);
      },
    },
  },
  lastName: {
    type: String,
    required: true,
    validate: {
      validator(lastName) {
        return validator.isAlphanumeric(lastName);
      },
    },
  },
  email: {
    type: String,
    required: true,
    validate: {
      validator(email) {
        return validator.isEmail(email);
      },
    },
  },
  displayName: {
    type: String,
    required: true,
    validate: {
      validator(displayName) {
        return validator.isAlphanumeric(displayName);
      },
    },
  },
  userId: {
    type: String,
    required: true,
  }
});

module.exports = model;