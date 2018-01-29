require('./config/config');

var express = require('express');
var bodyParser = require('body-parser');
const {ObjectID} = require('mongodb');
const _ = require('lodash');

var {mongoose} = require('./db/mongoose');
var {Firm} = require('./models/firm')
var {Sms} = require('./models/sms');
var {User} = require('./models/user');
var {authenticate} = require('./middleware/authenticate');
var {sendMessage} = require('./twilio/twilio');

var app = express();
const port = process.env.PORT;

app.use(bodyParser.json())

app.post('/firm', authenticate, (req, res) => {
    var firm = new Firm({
        name: req.body.name,
        number: req.body.number,
        _creator: req.user._id
    });

    firm.save().then((firm) => {
        res.send(firm);
    }, (e) => {
        res.status(400).send(e);
    });
});

app.get('/firms', authenticate, (req, res) => {
    Firm.find({
        _creator: req.user._id
    }).then((firms) => {
        res.send({firms});
    }, (e) => {
        res.status(400).send(e);
    })
});

app.get('/firm/:id', authenticate, (req, res) => {
    let id = req.params.id;
    if (!ObjectID.isValid(id)) {
        return res.status(400).send({
            message: 'ID is not valid'
        })
    }
    Firm.findOne({
        _creator: req.user._id,
        _id: id
    }).then((firm) => {
        if (!firm) {
            return res.status(400).send({
                message: 'Firm could not be found'
            });
        }
        res.send({firm});
    }, (e) => {
        res.status(400).send(e);
    });
});

app.delete('/firm/:id', authenticate, (req, res) => {
    let id = req.params.id;
    if (!ObjectID.isValid(id)) {
        return res.status(400).send({
            message: 'ID is not valid'
        });
    };

    Firm.findOneAndRemove({
        _creator: req.user._id,
        _id: id
    }).then((firm) => {
        if (!firm) {
            return res.status(400).send({
                message: 'That firm does not exist'
            });
        }
        res.send({firm});
    }, (e) => {
        res.status(400).send(e);
    });
});


//GETS ALL SMS FOR THE SPECIFIC FIRM
app.get('/firm/:id/allsms', authenticate, (req, res) => {
    let id = req.params.id;
    let allSmsById = [];
    if (!ObjectID.isValid(id)) {
        return res.status(400).send({
            message: 'ID is not valid'
        });
    };
    Firm.findOne({
        _creator: req.user._id,
        _id: id
    }).then((firm) => {
        if (!firm) {
            return res.status(400).send();
        };
        Sms.findSmsByPhoneNumber(firm.number)
            .then((sms) => {
                if (!sms) {
                    return res.status(400).send({
                        message: 'No sms found for this firm.'
                    })
                };

                res.send(sms);
            });
        }, (e) => {
            res.status(400).send(e);
        });
});

app.post('/sms', authenticate, (req, res) => {
    var sms = new Sms({
        title: req.body.title,
        content: req.body.content,
        numberTo: req.body.numberTo,
        _creator: req.user._id // id of the user from the authenticate middleware
    });

    sms.save().then((sms) => {
        res.send(sms);
    }, (e) => {
        res.status(400).send(e);
    })
});

app.get('/allsms', authenticate, (req, res) => {
    Sms.find({
        _creator: req.user._id
    }).then((sms) => {
        res.send({sms});
    }, (e) => {
        res.status(400).send(e);
    })
});

app.get('/sms/:id', authenticate, (req, res) => {
    let id = req.params.id;
    if (!ObjectID.isValid(id)) {
        return res.status(400).send({
            message: 'ID is not valid'
        })
    }

    Sms.findOne({
        _id: id,
        _creator: req.user._id
    })
    .then((sms) => {
        if (!sms) {
            return res.status(404).send({
                message: 'Sms could not be found.'
            });
        }
        res.send({sms});
    }, (e) => {
        res.status(400).send(e);
    });
});

app.get('/smsn/:number', authenticate, (req, res) => {
    let pNumber = req.params.number;
    
    Sms.findSmsByPhoneNumber(pNumber)
        .then((sms) => {
            res.send({sms});
        }, (e) => {
            res.status(400).send(e);
        });
});

app.delete('/sms/:id', authenticate, (req, res) => {
    let id = req.params.id;
    if (!ObjectID.isValid(id)) {
        return res.status(400).send({
            message: 'ID is not valid'
        })
    }

    Sms.findOneAndRemove({
        _id: id,
        _creator: req.user._id
    }).then(sms => {
        if (!sms) {
            return res.status(404).send({
                message: 'That id doesnt exist'
            })
        }
        res.send({sms});

    }, e => {
        res.status(400).send();
    }); 
});

app.post('/users', (req, res) => {
    let body = _.pick(req.body, ['email', 'password']);
    let newUser = new User(body);

    User.findOne({
        email: body.email
    }).then((user) => {
        if (user) {
            return res.status(400).send({
                message: 'User with that email already exists.'
            });
        }
        
        newUser.save().then(() => {
        return newUser.generateAuthToken();
        // res.send(user);
         }).then((token) => {
            res.header('x-auth', token).send({
             newUser,
                'token': token
         });
        }).catch(e => {
         res.status(400).send({
             message: 'Something went wrong with the registration.'
            });
         })       
    })

   
});

app.get('/users/me', authenticate, (req, res) => {
    res.send(req.user);
});

app.post('/users/login', (req, res) => {
    var body = _.pick(req.body, ['email', 'password']);

    User.findByCredentials(body.email, body.password).then((user) => {
        return user.generateAuthToken().then((token) => {
            res.header('x-auth', token).send(user);
        });
    }).catch((e) => {
        res.status(400).send();
    });
});

app.delete('/users/me/token', authenticate, (req, res) => {
    req.user.removeToken(req.token).then(() => {
        res.status(200).send();
    }, () => {
        res.status(400).send();
    })
});

app.post('/sms/send', authenticate, (req, res) => {
    var body = _.pick(req.body, ['message', 'numberTo']);

    sendMessage(body.message, body.numberTo).then((message) => {
        if (!message) {
            return res.status(400).send();
        }
        res.send({
            message: message.body
        });
    }, (e) => {
        res.status(400).send(e);
    });
});

app.listen(port, () => {
    console.log(`Started up at port ${port}`);
});

module.exports = {app};