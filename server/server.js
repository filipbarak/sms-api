require('./config/config');

var express = require('express');
var http = require('http');
var bodyParser = require('body-parser');
var socketIO = require('socket.io');
var cors = require('cors');
var randomize = require('randomatic');
const { ObjectID } = require('mongodb');
const _ = require('lodash');
const nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');

var { mongoose } = require('./db/mongoose');
var { Firm } = require('./models/firm')
var { Sms } = require('./models/sms');
var { FirmGroup } = require('./models/firmgroup')
var { User } = require('./models/user');
var { authenticate } = require('./middleware/authenticate');
var { sendMessage } = require('./twilio/twilio');

var app = express();
var server = http.createServer(app);
var io = socketIO(server);
const port = process.env.PORT;
var rand, mailOptions, host, link;

app.use(cors());
app.use(bodyParser.json());


let transporter = nodemailer.createTransport(smtpTransport({
    name: process.env.EMAIL_SENDER_NAME,
    host: process.env.EMAIL_SENDER_HOST,
    port: process.env.EMAIL_SENDER_PORT,
    secure: false,
    auth: {
        user: process.env.SENDER_EMAIL,
        pass: process.env.SENDER_PASSWORD
    },
    tls: {
        rejectUnauthorized: false
    },
    debug: true
}));

var sendMail = (req, res, id) => {
    host = req.get('host');
    link = `http://${host}/verify?id=${rand}&sc=${id}`;
    mailOptions = {
        from: `Верификација <${process.env.SENDER_EMAIL}>`,
        to: [req.body.email],
        subject: 'Верифицирајте го вашиот профил',
        html: `Кликнете на линкот за да го верифицирате вашиот e-mail. <br>
        <a href=${link}>Кликнете тука.</a>`
    };
    console.dir(mailOptions);
    transporter.sendMail(mailOptions, (err, response) => {
        if (err) {
            console.log(err, 'Error?');
            return res.status(400).send(err);
        }
        res.status(200).send();
    });
}

app.post('/sendemail', (req, res) => {


});

app.get('/verify', (req, res) => {
    console.log(rand, 'MAND');
    let id = req.query.sc;
    console.log(id);
    if ((`${req.protocol}://${req.get('host')}`) == (`http://${host}`)) {
        if (req.query.id == rand) {
            console.log('Email is verified')
            res.redirect(process.env.FRONTEND_URL);
            User.findByIdAndUpdate(id,
                {
                    $set: {
                        isVerified: true
                    }, $unset: {
                        tempHash: 1
                    }
                },
                { new: true }).then(user => {
                    console.log(user, 'UPDATED');
                });
        }
        else {
            console.log("Email was not verified");
            res.status(400).send();

        }
    }
    else {
        res.status(400).send();
    }
});


app.post('/firm', authenticate, (req, res) => {
    var firm = new Firm({
        name: req.body.name,
        number: req.body.number,
        hasFirm: req.body.hasFirm,
        _creator: req.user._id
    });

    Firm.findOne({
        number: req.body.number,
        _creator: req.user._id
    }).then(firmFound => {
        if (firmFound) {
            return res.status(400).send({
                message: `${firmFound.name} has that number already.`
            })
        }
        firm.save().then((firm) => {
            res.send(firm);
        }, (e) => {
            res.status(400).send(e);
        });

    });
});

//Use this only to sync contacts from Phone.
app.post('/firmsmany', authenticate, (req, res) => {
    let firms = req.body.firms;
    let firmsToSave = firms.map(firm => {
        return new Firm({
            name: firm.name,
            number: firm.number,
            hasFirm: firm.hasFirm,
            _creator: req.user._id
        });
    });
    Firm.insertMany(firmsToSave).then(result => {
        console.log(result);
        res.send(firms);
    }, e => {
        res.status(400).send({
            message: 'Something went wrong.'
        })
    });
});

app.get('/firms', authenticate, (req, res) => {
    Firm.find({
        _creator: req.user._id
    }).then((firms) => {
        res.send({ firms });
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
        res.send({ firm });
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
        res.send({ firm });
    }, (e) => {
        res.status(400).send(e);
    });
});

app.patch('/firms', authenticate, (req, res) => {
    const firms = req.body.firms;

    firms.forEach(firm => {
        const updateObj = { hasFirm: firm.hasFirm }
        Firm.findByIdAndUpdate(firm._id, updateObj, { new: true })
            .then(updatedFirm => {
                console.log('Everything is okay');
            }).catch(e => {
                res.status(400).send({
                    message: 'Something went wrong.'
                })
            })
    });
    res.status(200).send({
        message: `Updated all ${firms} `
    });
});

app.patch('/firm/:id', authenticate, (req, res) => {
    let id = req.params.id;
    let body = _.pick(req.body, ['hasFirm']);
    if (!ObjectID.isValid(id)) {
        return res.status(400).send({
            message: 'ID is not valid'
        })
    }


    Firm.findByIdAndUpdate(id, { $set: body }, { new: true }).then(firm => {
        if (!firm) {
            return res.status(404).send({
                message: 'Could not find that Firm'
            })
        }
        res.send({ firm });
    }).catch(e => {
        res.status(400).send(e);
    })
});


//SMS
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
        isSent: req.body.isSent,
        createdAt: Date.now(),
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
        res.send({ sms });
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
            res.send({ sms });
        }, (e) => {
            res.status(400).send(e);
        });
});

app.get('/smsn/:number', authenticate, (req, res) => {
    let pNumber = req.params.number;

    Sms.findSmsByPhoneNumber(pNumber)
        .then((sms) => {
            res.send({ sms });
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
        res.send({ sms });

    }, e => {
        res.status(400).send();
    });
});

app.patch('/sms/:id', authenticate, (req, res) => {
    let id = req.params.id;
    let body = _.pick(req.body, ['content', 'numberTo']);
    if (!ObjectID.isValid(id)) {
        return res.status(400).send({
            message: 'ID is not valid'
        })
    }

    Sms.findByIdAndUpdate(id, { $set: body }, { new: true }).then(sms => {
        if (!sms) {
            return res.status(404).send({
                message: 'Could not find that SMS'
            })
        }
        res.send({ sms });
    }).catch(e => {
        res.status(400).send(e);
    })
});

//USERS
app.post('/users', (req, res) => {
    let body = _.pick(req.body, ['email', 'password']);
    let newUser = new User(body);
    rand = randomize('A0', 16);

    User.findOne({
        email: body.email
    }).then((user) => {
        if (user) {
            return res.status(400).send({
                message: 'User with that email already exists.'
            });
        }

        newUser.isVerified = false;
        newUser.tempHash = rand;
        newUser.save().then(() => {
            return newUser.generateAuthToken();
            // res.send(user);
        }).then((token) => {
            res.header('x-auth', token).send({
                newUser
            });
            sendMail(req, res, newUser._id);
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

        if (!user) {
            return res.status(401).send({
                message: 'Invalid username or password'
            });
        }

        if (!user.isVerified) {
            return res.status(401).send({
                message: 'User is not verified'
            });
        }

        //Check if user is not logging in for the first time
        if (user.uniqueKey && user.isVerified) {
            console.log('User has unique key here...')
            return user.generateAuthToken().then((token) => {
                res.header('x-auth', token).send({
                    user,
                    'token': token,
                    'key': user.uniqueKey
                });
            });
        } else if (!user.uniqueKey && user.isVerified) {
            user.uniqueKey = randomize('Aa0', 5);
            return user.generateAuthToken().then((token) => {
                console.log('User is newly logged in.')
                res.header('x-auth', token).send({
                    user,
                    'token': token,
                    'key': user.uniqueKey,
                    'initialLogin': true
                });
            });
        }

    }).catch((e) => {
        res.status(400).send({
            message: 'Something went wrong with the request.'
        });
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

//FIRMGROUP

app.post('/firmgroup', authenticate, (req, res) => {
    let group = new FirmGroup({
        title: req.body.title,
        firms: req.body.firms,
        isFirm: req.body.isFirm || false,
        _creator: req.user._id
    });

    FirmGroup.findOne({ title: req.body.title })
        .then(fg => {
            if (fg) {
                return res.status(400).send({
                    'error': 'Group with that name already exists.'
                });
            }

            group.save().then(group => {
                res.send(group);
            }).catch(e => {
                res.status(400).send({
                    message: 'Could not create group',
                    e
                })
            })
        });
});

app.get('/groups', authenticate, (req, res) => {
    FirmGroup.find({ _creator: req.user._id, isFirm: false })
        .then(firmgroup => {
            if (!firmgroup) {
                return res.status(400).send({
                    e: 'Could not find that Group'
                })
            }

            res.status(200).send({ firmgroup })
        }).catch(e => {
            res.status(400).send({ 
                message: "Something went wrong",
                e
             })
        })
});

app.get('/group/:id', authenticate, (req, res) => {
    let id = req.params.id;
    if (!ObjectID.isValid(id)) {
        return res.status(400).send({
            message: 'ID is not valid'
        })
    }
    FirmGroup.find({_id: id, isFirm: false}).then(firmgroup => {
        if (!firmgroup) {
            return res.status(400).send({
                message: 'Group not found'
            })
        }
        res.send(firmgroup);
    }).catch(e => {
        res.status(400).send({
            message: "There was a problem reaching the server",
            e
        });
    });
});

app.get('/firmgroup', authenticate, (req, res) => {
    FirmGroup.find({ _creator: req.user._id }).then(firmgroup => {
        if (!firmgroup) {
            return res.status(400).send({
                message: 'Group not found'
            })
        }
        res.send(firmgroup);
    }).catch(e => {
        res.status(400).send({
            message: "There was a problem reaching the server",
            e
        });
    });
});

app.get('/firmgroup/:id', authenticate, (req, res) => {
    let id = req.params.id;
    if (!ObjectID.isValid(id)) {
        return res.status(400).send({
            message: 'ID is not valid'
        })
    }
    FirmGroup.findById(id).then(firmgroup => {
        if (!firmgroup) {
            return res.status(400).send({
                message: 'Group not found'
            })
        }
        res.send(firmgroup);
    }).catch(e => {
        res.status(400).send({
            message: "There was a problem reaching the server",
            e
        });
    });
});

app.delete('/firmgroup/:id', authenticate, (req, res) => {
    let id = req.params.id;
    if (!ObjectID.isValid(id)) {
        return res.status(400).send({
            message: 'ID is not valid'
        })
    }

    FirmGroup.findOneAndRemove({
        _id: id,
        _creator: req.user._id
    }).then(firmgroup => {
        if (!firmgroup) {
            return res.status(400).send({
                message: 'Could not find that id'
            })
        }
        res.send({ firmgroup });
    });
});


app.patch('/firmgroup/:id', authenticate, (req, res) => {
    let id = req.params.id;
    let body = _.pick(req.body, ['title', 'firms']);
    if (!ObjectID.isValid(id)) {
        return res.status(400).send({
            message: 'ID is not valid'
        })
    }
    FirmGroup.findByIdAndUpdate(id, { $set: body }, { new: true }).then(firmgroup => {
        if (!firmgroup) {
            return res.status(404).send({
                message: 'Could not find that FirmGroup'
            })
        }
        res.send(firmgroup);
    }).catch(e => {
        res.status(400).send(e);
    })
});

io.on('connection', (socket) => {
    console.log('Authentication passed!');


    socket.on('disconnect', function () {
        console.log('user disconnected');
    });

    socket.on('add-sms', (sms) => {
        let key = sms[1];
        let emitEvent = 'message' + key;
        io.emit(emitEvent, { type: 'new-sms', text: sms });
        console.log(sms);
    })

    socket.on('contacts', (contacts) => {
        console.dir(contacts, 'Contacts');
        let key = contacts['code'];
        let emitEvent = 'contacts' + key;
        console.log(JSON.stringify(emitEvent, null, 2));
        io.emit(emitEvent, { type: 'new-contact', contacts })
    });

    socket.on('smsSent', (result) => {
        console.log(result);
        let key = result['code'];
        let emitEvent = 'smsSent' + key;
        io.emit(emitEvent, {
            type: 'smsSent',
            isSuccess: result['isSuccess']
        })
    });

    socket.on('initConnection', (connection) => {
        console.log('LISTENING NOW....')
        let key = connection['code'];
        let emitEvent = 'initConnection' + key;
        io.emit(emitEvent, {
            success: `Успешно се поврзавте со кодот ${key}`
        })
    });
});

server.listen(port, () => {
    console.log(`Started up at port ${port}`);
});

module.exports = { app };