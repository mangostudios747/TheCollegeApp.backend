require('dotenv').config()
const { ApolloServer, gql } = require("apollo-server-express");
const { ApolloServerPluginDrainHttpServer } = require("apollo-server-core");
const http = require("http");
const express = require("express");
const cors = require("cors");
const path = require('path')
const { loadFiles, loadFilesSync } = require('@graphql-tools/load-files')
const { insertUser, generateJWT, hash } = require('../passport');
const { sendVerificationEmail } = require('../mail')
const mdb = require('../mongodb')

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


const app = express();
app.use(cors());
app.use(express.json());
const httpServer = http.createServer(app);
app.get('/', function (req, res){
    res.send("omg hi. The GraphQL server is available <a href='/graphql'>here</a>.")
})

async function main(app, httpServer) {
    const typeDefs = loadFilesSync(path.join(process.cwd(), 'locations.graphql'));
    console.log(typeDefs)
    const server = new ApolloServer({
        cache: "bounded",
        typeDefs,
        resolvers,
        plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
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

    await server.start()
    server.applyMiddleware({ app });
    await new Promise(resolve => httpServer.listen({ port: 4000 }, resolve));

    console.log(`🚀 Server ready at http://localhost:4000${server.graphqlPath}`);
}

main(app, httpServer);

module.exports = httpServer;
