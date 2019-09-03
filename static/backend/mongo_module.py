import pymongo as mongo

class Mongo:
    '''
    Module class that provides access to MongoDB with the ability to insert data into a collection and get data

    :Parameters:
        client: (String) URI of the MongoDB you want to connect with.
        db_name: (String) Name of the Database you want to access.
        collection: (String) Name of the collection you want to have the data from.
    
    Attributes:
        __client: (MongoClient) holds the connection with the MongoDB.
        __db: (Database) holds the connection to the choosen database.
        __collection: (Collection) hold the connection to the choosen collection.
    '''
    def __init__(self, client, db_name, collection):
        self.__client = mongo.MongoClient(client)
        self.__db = self.__client(db_name)
        self.__collection = self.__db(collection)