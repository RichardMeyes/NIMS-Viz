import pymongo as mongo
from bson.objectid import ObjectId


class Mongo:
    """
    Module class that provides access to MongoDB with the ability to insert data into a collection and get data

    :Parameters:
        client: (String) URI of the MongoDB you want to connect with.
        db_name: (String) Name of the Database you want to access.
        collection: (String) Name of the collection you want to have the data from.
    
    :Attributes:
        __client: (MongoClient) holds the connection with the MongoDB.
        __db: (Database) holds the connection to the choosen database.
        __collection: (Collection) hold the connection to the choosen collection.
    """
    def __init__(self, client, db_name, collection):
        self.__client = mongo.MongoClient(client)
        self.__db = self.__client[db_name]
        self.__collection = self.__db[collection]
    
    def get_item_by_id(self, item_id):
        """
        Returns an Item by uuid
        
        :Parameters:
            item_id: (string) The MongoDB uuid from the item you want to retrieve.
        """
        item = self.__collection.find_one({"_id": ObjectId(item_id)})
        item["_id"] = str(item["_id"])
        return item
    
    def get_all_items(self):
        """Returns a list of all items from the collaction"""
        
        item_list = []
        for item in self.__collection.find():
            item["_id"] = str(item["_id"])
            item_list.append(item)
        
        return item_list
    
    def get_items_by_attribute(self, a_name, a_content):
        """
        Returns a list all items that has given attributes

        :Parameters:
            a_name: (string) Name of the attribute you want look for.
            a_content: (string) Content/Identifier of the attribute you are looking for.
        """
        item_list = []
        for item in self.__collection.find({a_name: a_content}):
            item["_id"] = str(item["_id"])
            item_list.append(item)
        
        return item_list
    
    def count_items_by_attribute(self, a_name, a_content):
        """
        Returns the number of items in the collection with given attributes.

        :Parameters:
            a_name: (string) Name of the attribute you want look for.
            a_content: (string) Content/Identifier of the attribute you are looking for.
        """
        return self.__collection.count_documents({a_name: a_content})
    
    def count_all_items(self):
        """Returns the number of all items in the collections"""
        return self.__collection.count_documents({})
    
    def get_all_attributes(self, a_list):
        """
        Returns only the uuid and the wanted attributes from the collection.

        :Parameters:
            a_list: ([string]) List of attributes from which we want to have the information.
        """
        attribues_dict = {}
        for a in a_list:
            attribues_dict.setdefault(a, 1)

        item_list = []
        for item in self.__collection.find({}, attribues_dict):
            item["_id"] = str(item["_id"])
            item_list.append(item)
        return item_list
    
    def get_attributes_with_condition(self, a_list, condition):
        """
        Returns all uuids and all wanted attributes from the collection with a given condition.

        :Parameters:
            a_list: ([string]) List of attributes from which we want to have the information.
            condition: (Dictionary/JSON) Conditions that have to be fullfiled for an item
        """
        attribues_dict = {}
        for a in a_list:
            attribues_dict.setdefault(a, 1)

        item_list = []
        for item in self.__collection.find(condition, attribues_dict):
            item["_id"] = str(item["_id"])
            item_list.append(item)
        return item_list


    def post_item(self, item):
        """
        Posts an item to the database if it fails returns false, otherwise true and returns the uuid.
        Result is an array: first element is the uuid the sec. is the acknowledge.
        
        :Parameters:
            item: (Dictionary/JSON) Item you want to post in the database.
        """
        result = self.__collection.insert_one(item)
        return [result.inserted_id, result.acknowledged]

    def post_many_items(self, items):
        """
        Posts an item to the database if it fails returns false, otherwise true.
        
        :Parameters:
            items: ([Dictionary/JSON]) List of items you want to post in the database.
        """
        result = self.__collection.insert_many(items)
        return result.acknowledged
    
    def update_item(self, item_id, content):
        """
        Updates the attributes of an item with given uuid. It Returns the number of the updated element.

        :Parameters:
            item_id: (string) The MongoDB uuid from the item you want to update.
            content: (Dictionary/JSON) Content you want to update for the given item. Beware same attribute replace the old one.
        """
        result = self.__collection.update_one({"_id": ObjectId(item_id)}, {"$set": content})
        return result.modified_count
    
if __name__ == "__main__":
    pass