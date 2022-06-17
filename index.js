require('dotenv').config()
const { ApolloServer, gql } = require('apollo-server');
const { loadFiles } = require('@graphql-tools/load-files')
const mdb = require('./mongodb')
const {Tasks} = require('./mongodb')

const resolvers = {
    Query: {
        async task(obj, args, {dataSources}){
            return (await dataSources).tasks.getTask(args.id)
        },
        async allTasks(_,__,{}){
            // use the user context to return the appropriate tasks
        },
        test(){
            return "hello world"
        }
    },
    Task: {
        id(obj){
            console.log(obj)
            return obj._id
        },
        async parent(obj,  _, { dataSources }){
            return (await dataSources).tasks.getTask(obj.parentID)
        },
        async children(obj, _, {dataSources}){
            return (await dataSources).tasks.getTaskChildren(obj._id)
        }
    },
    Mutation: {
        createTask(parent, args) {
            return new Promise((resolve, reject) => {
                mdb.tasksCollection.then(c => {
                    const doc = {
                        text: args.text,
                        tags: args.tags || [],
                        parentID: args.parentID || null,
                        _id: mdb.genID()
                    }
                    c.insertOne(doc).then(d => {
                        doc._id = d.insertedId;
                        resolve(doc)
                    })
                })
            })
            
        }
    }
};

async function main() {
    const server = new ApolloServer({
        typeDefs: await loadFiles('./locations.graphql'),
        resolvers,
        dataSources: async () => ({
            tasks: new Tasks(await mdb.tasksCollection)
          }),
        context: ({ req, res }) => ({ req, res }),
    });

    server.listen(4000).then(({ url }) => {
        console.log(`🚀 Server ready at ${url}`);
    });
}
main()