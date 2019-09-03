import pymongo as mongo
from bson.objectid import ObjectId

class Mongo:
    '''
    Module class that provides access to MongoDB with the ability to insert data into a collection and get data

    :Parameters:
        client: (String) URI of the MongoDB you want to connect with.
        db_name: (String) Name of the Database you want to access.
        collection: (String) Name of the collection you want to have the data from.
    
    :Attributes:
        __client: (MongoClient) holds the connection with the MongoDB.
        __db: (Database) holds the connection to the choosen database.
        __collection: (Collection) hold the connection to the choosen collection.
    '''
    def __init__(self, client, db_name, collection):
        self.__client = mongo.MongoClient(client)
        self.__db = self.__client[db_name]
        self.__collection = self.__db[collection]
    
    def get_item_by_id(self, item_id):
        '''
        Returns an Item by uuid
        
        :Parameters:
            item_id: (string) The MongoDB uuid from the item you want to retrieve.
        '''
        return self.__collection.find_one({"_id": ObjectId(item_id)})
    
    def get_all_items(self):
        '''Returns a list of all items from the collaction'''
        
        item_list = []
        for item in self.__collection.find():
            item_list.append(item)
        
        return item_list
    
    def get_items_by_attribute(self, a_name, a_content):
        '''
        Returns a list all items that has given attributes

        :Parameters:
            a_name: (string) Name of the attribute you want look for.
            a_content: (string) Content/Identifier of the attribute you are looking for.
        '''
        item_list = []
        for item in self.__collection.find({a_name, a_content}):
            item_list.append(item)
        
        return item_list
    
    def count_items_by_attribute(self, a_name, a_content):
        '''
        Returns the number of items in the collection with given attributes.

        :Parameters:
            a_name: (string) Name of the attribute you want look for.
            a_content: (string) Content/Identifier of the attribute you are looking for.
        '''
        return self.__collection.count_documents({a_name: a_content})
    
    def count_all_items(self):
        '''Returns the number of all items in the collections'''
        return self.__collection.count_documents({})