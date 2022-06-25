require('dotenv').config()
const { ApolloServer } = require('apollo-server');
const { loadFiles } = require('@graphql-tools/load-files')
const { insertUser, generateJWT, hash } = require('./passport');
const { sendVerificationEmail } = require('./mail')
const mdb = require('./mongodb')

const resolvers = {
    Query: {
        test() {
            return "hello world"
        },
        me(_, __, {token}){

        }
    },
    Mutation: {
        async createUserAndSendVerification(_, { username, email, password },){ // ok this works
            const user = await insertUser({email, password, username})
            const jwt = generateJWT(user);
            // send verification email
            sendVerificationEmail(user.email, user.verificationToken, 'localhost:3000')
            // should return jwt
            return {
                jwt
            }
        },
        async verifyUserEmail(_, { token }){
            // look up the user by token
            // set their boolean to true
            await (await mdb.usersCollection).findOneAndUpdate({verificationToken: token}, {$set: { emailVerified: true}})
            // return success!
            return true

        },
        async login(_, { username, password }){
            // hash pw
            const pwHash = hash(password)
            // check if that combo exists
            const user = await (await mdb.usersCollection).findOne({username, pwHash})
            // return a jwt
            if (!user) {
                return {
                    error: "INCORRECT_CREDENTIALS"
                }
            }
            return {
                jwt: generateJWT(user)
            }
        },
    }
};
console.log(resolvers)
async function main() {
    const server = new ApolloServer({
        typeDefs: await loadFiles('./locations.graphql'),
        resolvers,
        dataSources: async () => ({
            //tasks: new Tasks(await mdb.tasksCollection)
            users: new mdb.Users(await mdb.usersCollection)
        }),
        context: ({ req, res }) => {
            const token = req.headers.authorization || '';
            // deserialize token
            // query for user and get complete data
            return { req, res, token }
        },
    });

    server.listen(4000).then(({ url }) => {
        console.log(`🚀 Server ready at ${url}`);
    });
}

main()

module.exports = main
