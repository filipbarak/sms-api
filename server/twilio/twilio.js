var accSid = process.env.TWILIO_ACCOUNT_SID;
var authToken = process.env.TWILIO_TOKEN;
var numberFrom = process.env.TWILIO_NUMBER_FROM;

var twilio = require('twilio');
var client = new twilio(accSid, authToken);


var sendMessage = (body, to) => {
    return new Promise((resolve, reject) => {
        client.messages.create({
            body: body,
            to: to,
            from: numberFrom
        }).then((message) => {
            resolve(message);
        }, (e) => {
            reject();
        });
    });
};

module.exports = {sendMessage};