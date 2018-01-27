var mongoose = require('mongoose');

var Firm = mongoose.model('Firm', {
    name: {
        type: String,
        required: true,
        minlength: 1
    },
    number: {
        type: String,
        required: true,
        minlength: 1
    },
    _creator: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    }
});

module.exports = {Firm};