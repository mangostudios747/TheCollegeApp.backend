const passport = require('passport');
const jwt = require('jsonwebtoken');
const { Strategy: GoogleTokenStrategy } = require('passport-google-token');

const GoogleTokenStrategyCallback = (accessToken, refreshToken, profile, done) => done(null, {
    accessToken,
    refreshToken,
    profile,
});

passport.use(new GoogleTokenStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
}, GoogleTokenStrategyCallback));

// promisified authenticate functions

const authenticateGoogle = (req, res) => new Promise((resolve, reject) => {
    passport.authenticate('google-token', { session: false }, (err, data, info) => {
        if (err) reject(err);
        resolve({ data, info });
    })(req, res);
});

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

const upsertGoogleUser = async function ({ accessToken, refreshToken, profile }) {
    const User = this;

    const user = await User.findOne({ 'social.googleProvider.id': profile.id });

    // no user was found, lets create a new one
    if (!user) {
        const newUser = await User.create({
            name: profile.displayName || `${profile.familyName} ${profile.givenName}`,
            email: profile.emails[0].value,
            'social.googleProvider': {
                id: profile.id,
                token: accessToken,
            },
        });

        return newUser;
    }
    return user;
};

module.exports = { authenticateGoogle };