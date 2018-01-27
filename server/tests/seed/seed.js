const {ObjectID} = require('mongodb');
const jwt = require('jsonwebtoken');

const {Firm} = require('./../../models/firm');
const {Sms} = require('./../../models/sms');
const {User} = require('./../../models/user');

const userOneId = new ObjectID();
const userTwoId = new ObjectID();



const users = [{
    _id: userOneId,
    email: 'filipbarak@example.com',
    password: 'userOnePass',
    tokens: [{
        access: 'auth',
        token: jwt.sign({_id: userOneId, access: 'auth'}, process.env.JWT_SECRET).toString()
    }]
}, {
    _id: userTwoId,
    email: 'filiptest@example.com',
    password: 'userTwoPass',
    tokens: [{
        access: 'auth',
        token: jwt.sign({_id: userTwoId, access: 'auth'}, process.env.JWT_SECRET).toString()
    }]
}];

const firms = [{
    name: 'Firm number one',
    number: '38976766766',
    _creator: userOneId
}, {
    name: 'Firm Number Two',
    number: '38971961961',
    _creator: userTwoId
}];

const sms = [{
    title: 'New update',
    content: 'There is a new update please update',
    numberTo: '38976766766',
    _id: new ObjectID(),
    _creator: userOneId
}, {
    title: 'Even newer update',
    content: 'There is an even NEWER update',
    numberTo: '38976766766',
    _id: new ObjectID(),
    _creator: userTwoId
}];

const populateFirms = (done) => {
    Firm.remove({}).then(() => {
        return Firm.insertMany(firms);
    }).then(() => {
        done();
    });
};

const populateSms = (done) => {
    Sms.remove({}).then(() =>{
        return Sms.insertMany(sms);
    }).then (() => {
        done();
    })
};

const populateUsers = (done) => {
    User.remove({}).then(() => {
        let userOne = new User(users[0]).save();
        let userTwo = new User(users[1]).save();

        return Promise.all([userOne, userTwo])
    }).then(() => done());
    
};

module.exports = {sms, populateSms, users, populateUsers, firms, populateFirms};