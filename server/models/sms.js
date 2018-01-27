var mongoose = require('mongoose');

var Sms = mongoose.model('Sms', {
    title: {
        type: String,
        required: true,
        minlength: 1
    },
    content: {
        type: String,
        required: true
    },
    numberTo: {
        type: String,
        required: true
    },  
    _creator: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    _firmId: {
        type: mongoose.Schema.Types.ObjectId,
    }
});

module.exports = {Sms};