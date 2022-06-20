const passport = require('passport');
const jwt = require('jsonwebtoken');
const { usersCollection, passwordsCollection, genID } = require('./mongodb')
var LocalStrategy = require('passport-local').Strategy;
var crypto = require('crypto');


passport.use(
    new LocalStrategy(async function verify(username, password, done) {
        try {
            const pc = await passwordsCollection;
            const user = await pc.findOne({ username, passwordHash: crypto.Hash(password) });
            if (!user) return done(null, false, { message: 'Incorrect username or password.' });
            return done(null, user)
        }
        catch (err) {
            return done(err)
        }

    })
);

const hash = (str) => crypto.createHash('md5').update(str).digest("hex")

const generateJWT = (user) => {
    const today = new Date();
    const expirationDate = new Date(today);
    expirationDate.setDate(today.getDate() + 60);

    return jwt.sign({
        email: user.email,
        id: user._id,
        exp: parseInt(expirationDate.getTime() / 1000, 10),
    }, 'secret');
}

const insertUser = async function ({ email, password, username }) {
    const uc = await usersCollection;
    const uid = genID();
    const newUser = await uc.insertOne({
        _id: uid,
        username,
        email,
        pwHash: hash(password)
    });

    return newUser;
};

module.exports = { insertUser, generateJWT, hash };