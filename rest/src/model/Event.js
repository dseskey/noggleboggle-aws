const mongoose = require('mongoose');
const validator = require('validator');

const model = mongoose.model('Event', {
    owner: {
        type: String,
        required: true,
        validate: {
            validator(owner) {
                return validator.isAlphanumeric(owner);
            },
        },
    },
    creation: {
        type: String,
        required: true,
        validate: {
            validator(creation) {
                return validator.isAlphanumeric(creation);
            },
        },
    },
    eventStart: {
        type: String,
        required: true,
        validate: {
            validator(eventStart) {
                return validator.isEmail(eventStart);
            },
        },
    },
    eventCompletion: {
        type: String,
        required: true,
        validate: {
            validator(eventCompletion) {
                return validator.isAlphanumeric(eventCompletion);
            },
        },
    },
    eventCode: {
        type: String,
        required: true,
        validate: {
            validator(eventCompletion) {
                return validator.isAlphanumeric(eventCompletion);
            },
        },
    },
    isEventStarted: {
        type: String,
        required: true,
        validate: {
            validator(isEventStarted) {
                return validator.isAlphanumeric(isEventStarted);
            },
        },
    },
    isEventCompleted: {
        type: String,
        required: true,
        validate: {
            validator(isEventCompleted) {
                return validator.isAlphanumeric(isEventCompleted);
            },
        },
    },
    games: {
        type: Array,
        required: true,
    },
    players: {
        type: Array,
        required: true,
    },
});

module.exports = model;