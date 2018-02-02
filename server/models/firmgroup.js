var mongoose = require('mongoose');

var FirmGroupSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        minlength: 1
    },
    firms: [{
        name: {
            type: String,
            required: true
        },
        number : {
            type: String,
            required: true
        }
    }],
    _creator: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    }
});

var FirmGroup = mongoose.model('FirmGroup', FirmGroupSchema);

module.exports = {FirmGroup};