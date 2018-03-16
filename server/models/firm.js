var mongoose = require('mongoose');

var FirmSchema = new mongoose.Schema({
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
    hasFirm: {
        type: Boolean
    },
    _creator: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    sms: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Sms' }]
});

var Firm = mongoose.model('Firm', FirmSchema);

module.exports = { Firm };