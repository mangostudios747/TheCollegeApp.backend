const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { MongoDataSource } = require('apollo-datasource-mongodb')
const uri = process.env.MONGO_URL;
const mdb =  new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1, maxIdleTimeMS : 270000, minPoolSize : 2, maxPoolSize : 4 }).connect();


function genID(){
    return (new ObjectId()).toString()
}

const contentDB = mdb.then(client => client.db("content"))
const authDB = mdb.then(client => client.db("auth"))
const tasksCollection = contentDB.then(db => db.collection("tasks"))
const tagsCollection = contentDB.then(db => db.collection("tags"))
const usersCollection = authDB.then(db=>db.collection("users"));

class Tasks extends MongoDataSource {
    getTask(id) {
        return this.collection.findOne({_id: id})
    }
    getTaskChildren(id){
        return this.collection.find({parentID: id}).toArray();
    }
}

class Users extends MongoDataSource {
    getUser(uid){
        return this.collection.findOne({_id:uid});
    }
}

module.exports = {
    tagsCollection, tasksCollection, genID, Users, mdb , usersCollection
}
