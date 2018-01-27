const expect = require('expect');
const request = require('supertest');
const {ObjectID} = require('mongodb');

const {app} = require('./../server');
const {Sms} = require('./../models/sms');
const {Firm} = require('./../models/firm');
const {sms, populateSms, users, populateUsers, firms, populateFirms} = require('./seed/seed');
const {User} = require('./../models/user');


beforeEach(populateFirms);
beforeEach(populateUsers);
beforeEach(populateSms);

describe('POST /firm', () => {
    it('should create a new firm', (done) => {
        let name = 'New Firm';
        let number = '38976766766';

        request(app)
            .post('/firm')
            .set('x-auth', users[0].tokens[0].token)
            .send({name, number})
            .expect(200)
            .expect((res) => {
                expect(res.body.name).toBe(name);
                expect(res.body.number).toBe(number);
            }).end((err, res) => {
                if (err) {
                    return done(err);
                }

                Firm.find({name, number}).then((firm) => {
                    expect(firm.length).toBe(1);
                    expect(firm[0].name).toBe(name);
                    done();
                }).catch((e) => {
                    done(e);
                });
            });
    });
});

describe('POST /sms', () => {
    it('should create a new sms', (done) => {
        var title = 'Test sms title';

        request(app)
            .post('/sms')
            .set('x-auth', users[0].tokens[0].token)
            .send({
                title: title,
                content: 'Something',
                numberTo: "333333"
            })
            .expect(200)
            .expect((res) => {
                expect(res.body.title).toBe(title);
            })
            .end((err, res) => {
                if(err) {
                    return done(err);
                }

                Sms.find({title}).then((sms) => {
                    expect(sms.length).toBe(1);
                    expect(sms[0].title).toBe(title);
                    done();
                }).catch((e) => done(e));
            });
    });

    it('should not create sms with invalid body data', (done) => {
        request(app)
            .post('/sms')
            .set('x-auth', users[0].tokens[0].token)
            .send({})
            .expect(400)
            .end((err, res) => {
                if(err) {
                    return done(err);
                }
                Sms.find().then((sms) => {
                    expect(sms.length).toBe(2);
                    done();
                }).catch((e) => done(e));
            
            })
    });
});

describe('GET /allsms', () => {
    it('should get all sms', (done) => {
        request(app)
            .get('/allsms')
            .set('x-auth', users[0].tokens[0].token)
            .expect(200)
            .expect((res) => {
                expect(res.body.sms.length).toBe(1);
            }).end(done);
    })
});

describe('GET /sms/:id', () => {
    it('should return a single SMS', (done) => {
        request(app)
            .get(`/sms/${sms[0]._id.toHexString()}`)
            .set('x-auth', users[0].tokens[0].token)
            .expect(200)
            .expect(res => {
                expect(res.body.sms.title).toBe(sms[0].title)
            })
            .end(done)
    });

    it('should not return an sms created by other user', (done) => {
        request(app)
            .get(`/sms/${sms[1]._id.toHexString()}`)
            .set('x-auth', users[0].tokens[0].token)
            .expect(404)
            .end(done)
    });

    it('should return a 404 if sms not found', (done) => {
        let id = new ObjectID();
        request(app)
            .get(`/sms/${id.toHexString()}`)
            .set('x-auth', users[0].tokens[0].token)
            .expect(404)
            .end(done)
    });

    it('should return 400 for non-object ids', (done) => {
        request(app)
            .get('/sms/123')
            .set('x-auth', users[0].tokens[0].token)
            .expect(400)
            .end(done)
    })

});

describe('DELETE /sms/:id', () => {
    it('should remove an sms', (done) => {
        let hexId = sms[1]._id.toHexString();

        request(app)
            .delete(`/sms/${hexId}`)
            .set('x-auth', users[1].tokens[0].token)
            .expect(200)
            .expect((res) => {
                expect(res.body.sms._id).toBe(hexId);
            })
            .end((err, res) => {
                if (err) {
                    return done(err);
                }

                Sms.findById(hexId).then(sms => {
                    expect(sms).toNotExist();
                    done();
                }).catch(err => {
                    done(err);
                })
            })
    });

    it('should return 404 if sms not found', (done) => {
        let id = new ObjectID();
        request(app)
            .delete(`/sms/${id.toHexString()}`)
            .set('x-auth', users[0].tokens[0].token)
            .expect(404)
            .end(done)

    });

    it('should return 400 if objectId is invalid', (done) => {
        request(app)
        .delete('/sms/123')
        .set('x-auth', users[0].tokens[0].token)
        .expect(400)
        .end(done)
    })
});

describe('GET /users/me', () => {
    it('should return user if authenticated', (done) => {
        request(app)
            .get('/users/me')
            .set('x-auth', users[0].tokens[0].token)
            .expect(200)
            .expect((res) => {
                expect(res.body._id).toBe(users[0]._id.toHexString());
                expect(res.body.email).toBe(users[0].email);
            })
            .end(done);
    });

    it('should return 401 if not authenticated', (done) => {
        request(app)
            .get('/users/me')
            .expect(401)
            .expect((res) => {
                expect(res.body).toEqual({});
            })
            .end(done);
    });
});

describe('POST /users', () => {
    it('should create a user', (done) => {
        let email = 'example@example.com';
        let password = '123mnb!';
        request(app)
            .post('/users')
            .send({email, password})
            .expect(200)
            .expect(res => {
                expect(res.headers['x-auth']).toExist();
                expect(res.body._id).toExist();
                expect(res.body.email).toBe(email);
            })
            .end((err) => {
                if (err) {
                    return done(err);
                }

                User.findOne({email}).then(user => {
                    expect(user).toExist();
                    expect(user.password).toNotBe(password);
                    done();
                }).catch(e => {
                    done(e);
                })
            });
    });

    it('should return validation errors if request invalid', (done) => {
        let email = 'aaaa';
        let password = 'ffff';
        request(app)
            .post('/users')
            .send({email, password})
            .expect(400)
            .expect(res => {
                expect(res.headers['x-auth']).toNotExist();
            })
            .end(done);

    });

    it('should not create user if email in use', (done) => {
        let email = users[0].email;
        let password = 'validpass123';
        request(app)
            .post('/users')
            .send({email, password})
            .expect(400)
            .end(done);
    });
});

describe('POST /users/login', () => {
    it('should login user and return auth token', (done) => {
        request(app)
            .post('/users/login')
            .send({
                email: users[1].email,
                password: users[1].password
            })
            .expect(200)
            .expect(res => {
                expect(res.headers['x-auth']).toExist();
            })
            .end((err, res) => {
                if (err) {
                    return done(err);
                }

                User.findById(users[1]._id).then(user => {
                    expect(user.tokens[1]).toInclude({
                        access: 'auth',
                        token: res.headers['x-auth']
                    });
                    done();
                }).catch((e) => {
                    done(e);
                })
            });

    });

    it('should reject invalid login', (done) => {
        request(app)
            .post('/users/login')
            .send({
                email: users[1].email,
                password: 'something'
            })
            .expect(400)
            .expect(res => {
                expect(res.headers['x-auth']).toNotExist();
            })
            .end(done);
    })
});

describe('DELETE /users/me/token', () => {
    it('should delete the token', (done) => {
        let token = users[0].tokens[0].token;
        let id = users[0]._id;
        request(app)
            .delete('/users/me/token')
            .set('x-auth', token)
            .expect(200)
            .end((err, res) => {
                if (err) {
                    return done(err);
                }
                User.findById(id).then(user => {
                    expect(user.tokens.length).toBe(0);
                    done();
                }).catch((e) => done(e));
         })
    })
})