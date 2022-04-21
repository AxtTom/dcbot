import * as Mongo from 'mongodb';

class EasyMongo {
    private collection: Mongo.Collection<Mongo.Document>;

    constructor(collection: Mongo.Collection<Mongo.Document>) {
        this.collection = collection;
    }

    public get(filter: Mongo.Filter<Mongo.Document>): Promise<Mongo.WithId<Mongo.Document>> {
        return this.collection.findOne(filter);
    }
    public set(filter: Mongo.Filter<Mongo.Document>, data: Mongo.Document) {
        return this.collection.findOne(filter).then(doc => {
            if (doc) {
                this.collection.updateOne(filter, { $set: data });
            }
            else {
                return this.collection.insertOne(data);
            }
        });
    }
}

export {
    EasyMongo
};