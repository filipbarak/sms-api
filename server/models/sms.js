var mongoose = require('mongoose');

var SmsSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        minlength: 1
    },
    content: {
        type: String,
        required: true
    },
    numberTo: [{
        type: String,
        required: true
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    _creator: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    isSent: {
        type: Boolean
    },
    firms: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Firm' }],
});

SmsSchema.statics.findSmsByPhoneNumber = function (number) {
    var Sms = this;

    return Sms.find({
        numberTo: number
    }).then((sms) => {
        if (!sms) {
            return Promise.reject();
        }
        return Promise.resolve(sms);
    })
}

var Sms = mongoose.model('Sms', SmsSchema);

module.exports = { Sms };