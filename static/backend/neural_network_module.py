import torch
import torchvision
import json

import re

import torch.nn as nn
import torch.optim as optim
import torchvision.transforms as transforms
import torch.nn.functional as F

import numpy as np

import collections

from torch.autograd import Variable


class Sequential_Net(nn.Module):
    """
    Neural Network that can be user definable. Layers are stored in Sequential Containars.

    :Parameters: 
        input_dim: ([Integer]) Input dimension for the neural network as Array. Example: [x], [x, y], [x, y, z]
        layers: (collections.OrderdDict) List of Dictionarys of layer settings. Example: {"type": "conv2d", "inChannel": 1, "outChannel": 3, "kernelSize": 3, "stride": 1, "padding": 0, "activation": "relu"}
    
    :Attributes:
        layer_settings: (collections.OrderedDict) Holds an orderd Dictionary thats hold the settings of a layer.
        model: (nn.Sequential) Stores the layers of the Model and connect them with each other.

    :Global attributes:
        __activations: (Dictionary) Dictionary of activation function so it can be called with a string.
        __loss: (Dictionary) Dictionary of loss function so it can be called with a string.
        __optimizer: (Dictionary) Dictionary of optimizer so it can be called with a string.
    """
    __activations = {
    'relu': nn.ReLU,
    'sigmoid': nn.Sigmoid,
    'tanh': nn.Tanh,
    'softmax': nn.Softmax
    }

    __loss = {
        'crossEntropy': nn.CrossEntropyLoss,
        'nLogLikelihood': nn.NLLLoss,
        'mse': nn.MSELoss
    }

    __optimizer = {
        'sgd': optim.SGD,
        'adam': optim.Adam
    }

    __pooling = {
        'maxPool2d': nn.MaxPool2d,
        'avgPool2d' : nn.AvgPool2d
    }
    
    def __init__(self, input_dim = [1], layers = collections.OrderedDict()):
        super(Sequential_Net, self).__init__()
        self.layer_settings = collections.OrderedDict()

        self.dimension = ()

        if len(input_dim) is 1:
            self.dimension = (input_dim[0], 1, 1)
        elif len(input_dim) is 2:
            self.dimension = (input_dim[0], input_dim[1], 1)
        else:
            self.dimension = (input_dim[0], input_dim[1], input_dim[2])

        for container in layers:
            settings, model = Sequential_Net.__init_model(self, layers[container])

            self.layer_settings.update({container: settings})
            self.__setattr__(container, model)

    def __init_model(self, layers):
        """
        Private Method: Creates Layers for the model and the necessary settings as a dict.
        Returns a tuple of collections.OrderedDict with the settings for each layer and a nn.Sequential within a collections.OrderedDict for the nn.Sequential model.

        :Parameters: 
        layers: (collections.OrderdDict) List of Dictionarys of layer settings. Example: {"type": "conv2d", "inChannel": 1, "outChannel": 3, "kernelSize": 3, "stride": 1, "padding": 0, "activation": "relu"}
            
        """
        settings_dict =  collections.OrderedDict()
        model_dict = collections.OrderedDict()

        layer_counter = 0
        for layer in layers:
            """Adds the layer informations to a settings dictionary for rebuilding the network."""
            settings_dict["layer_"+ str(layer_counter)] = layer
            if layer["type"] == "conv2d":
                """
                If the layer is a conv 2D-layer.
                """
                model_dict["conv2d" + str(layer_counter)] = nn.Conv2d(layer["inChannel"], layer["outChannel"], layer["kernelSize"], layer["stride"], layer["padding"])

                """ computation of the new input dimension """
                new_width = np.floor( ( ( (self.dimension[0] - layer["kernelSize"]) + (2 * layer["padding"]) ) / layer["stride"] ) + 1 )
                new_height = np.floor( ( ( (self.dimension[1] - layer["kernelSize"]) + (2 * layer["padding"]) ) / layer["stride"] ) + 1 )
  
                self.dimension = (new_width, new_height, layer["outChannel"])
            
            elif "Pool" in layer["type"]:
                """
                If the layer is a Pooling Layer.
                """
                pooling = Sequential_Net.__pooling[layer["type"]]
                model_dict[str(layer["type"]) + str(layer_counter)] = pooling(layer["kernelSize"], stride = layer["stride"])

                """ computation of the new input dimension """
                new_width = np.floor( ( ( (self.dimension[0] - layer["kernelSize"])  ) / layer["stride"] ) + 1 )
                new_height = np.floor( ( ( (self.dimension[1] - layer["kernelSize"])  ) / layer["stride"] ) + 1 )
                self.dimension = (new_width, new_height, self.dimension[2])
            
            elif layer["type"] == "linear":
                """
                If the layer is a linear-layer.
                """
                model_dict[str(layer["type"]) + str(layer_counter)] = nn.Linear(int(np.prod(self.dimension)), layer["outChannel"])
                
                self.dimension = (layer["outChannel"], 1, 1)

            if layer["activation"] != "none":
                """
                If there is an activation add it.
                """
                activation = Sequential_Net.__activations[layer["activation"]]
                model_dict[layer["activation"] + str(layer_counter)] = activation()
            
            layer_counter += 1
                
        return settings_dict, nn.Sequential(model_dict)

    def forward(self, x):
        for container in self.layer_settings:
            if self.layer_settings[container]["layer_0"]["type"] == "linear":
                """
                If the model is linear reshape the input.
                """
                x = x.view(x.shape[0], -1)
            x = self.__getattr__(container)(x)
        return x

    def train_start(self, num_epochs, trainloader, loss, opti, l_rate, device = "cpu"):
        """
        Train the neural network and returns a list with a dictionary for each epoch with weights.

        :Parameters:
            num_epochs: (Integer) Number of epochs the network should be trained.
            device: (String) Divice that will be used for the training. Default is cpu.
            trainloader: (trainloader) Train data the model should be trained for.
            loss: (string) Loss Function for the training.
            opti: (string) Function for the optimazation of the weights.
            l_rate: (Float) learningrate for the training.
        """
        log_interval = 10

        criterion = Sequential_Net.__loss[loss]()

        optimizer = Sequential_Net.__optimizer[opti](self.parameters(), lr=l_rate)

        # dict for storeing the weights after an epoch
        epoch_weights_list = []
        for epoch in range(num_epochs):
            for batch_idx, (data, target) in enumerate(trainloader):
                data, target = Variable(data), Variable(target)
                if device == "cuda:0":
                    data, target = data.to(device), target.to(device)
                # # resize data from (batch_size, 1, 28, 28) to (batch_size, 28*28)
                # data = data.view(-1, 28 * 28)
                optimizer.zero_grad()
                net_out = self(data)
                loss = criterion(net_out, target)
                loss.backward()
                optimizer.step()
                if batch_idx % log_interval == 0:
                    print('Train Epoch: {} [{}/{} ({:.0f}%)]\tLoss: {:.6f}'.format(epoch, batch_idx * len(data),
                                                                                   len(trainloader.dataset),
                                                                                   100. * batch_idx / len(
                                                                                       trainloader),
                                                                                   loss.data.item()))
            epoch_weights_list.append(get_weights(self))
        return epoch_weights_list

    def test_start(self, loss, testloader, device = "cpu"):
        # test the net
        criterion = Sequential_Net.__loss[loss]()

        test_loss = 0
        correct = 0
        correct_class = np.zeros(10)
        correct_labels = np.array([], dtype=int)
        class_labels = np.array([], dtype=int)
        for i_batch, (data, target) in enumerate(testloader):
            data, target = Variable(data), Variable(target)
            if device == "cuda:0":
                data, target = data.to(device), target.to(device)
            # data = data.view(-1, 28 * 28)
            net_out = self(data)
            # sum up batch loss
            test_loss += criterion(net_out, target).data.item()
            pred = net_out.data.max(1)[1]  # get the index of the max log-probability
            batch_labels = pred.eq(target.data)
            correct_labels = np.append(correct_labels, batch_labels.cpu())
            class_labels = np.append(class_labels, target.data.cpu())
            for i_label in range(len(target)):
                label = target[i_label].item()
                correct_class[label] += batch_labels[i_label].item()
            correct += batch_labels.sum()
        test_loss /= len(testloader.dataset)
        print('\nTest set: Average loss: {:.4f}, Accuracy: {}/{} ({:.2f}%)\n'.format(test_loss, correct,
                                                                                     len(testloader.dataset),
                                                                                     100. * correct.item() / len(
                                                                                         testloader.dataset)))
        acc = 100. * correct.item() / len(testloader.dataset)
        # calculate class_acc
        acc_class = np.zeros(10)
        for i_label in range(10):
            num = (testloader.dataset.test_labels.numpy() == i_label).sum()
            acc_class[i_label] = correct_class[i_label] / num
        return acc, correct_labels, acc_class, class_labels

    def predict(self, _input):
        """
        Returns the prediction of the model

        :Parameters:
            _input: Input that should give a predictions.
        """
        return self(_input).tolist()
    
    def visualize_input(self, x):
        """
        Returns a Dictionary of input visualization.

        :Parameters:
            x: Input that should be vizualize.
        """
        feature_dict = collections.OrderedDict()

        for container in self.layer_settings:
            layers = self.layer_settings[container]
            layer_counter = 0
            is_linear = False
            for layer in layers:
                if layers[layer]["type"] == "linear" and not is_linear:
                    x = x.view(x.shape[0], -1)
                    is_linear = True

                x = self.__getattr__(container).__getattr__(layers[layer]["type"] + str(layer_counter))(x)
            
                feature_dict["layer_" + str(layer_counter)] = x.data.numpy().tolist()

            layer_counter += 1
        
        return feature_dict

def create_model(input_dim, layers):
    """
    Creates and Return a neural network model for given input.

    :Parameters:
        input_dim: ([Integer]) Input dimension for the neural network as Array. Example: [x], [x, y], [x, y, z]
        layers: ([Dictionary]) List of Dictionarys of layer settings. Example: {"type": "conv2d", "inChannel": 1, "outChannel": 3, "kernelSize": 3, "stride": 1, "padding": 0 "activation": "relu"}
    """
    return Sequential_Net(input_dim, layers)

def train_model(model, num_epochs, criterion, optimizer, trainset, batchsize, l_rate, device = "cpu"):
    """
    Trains a given model and returns for each epochs a list of layer dictionary with weights.

    :Parameters:
        model: (Net) Neural network that should be trained.
        num_epochs: (Integer) Number of epochs the network should be trained.
        criterion: (string) Loss Function for the training.
        optimizer: (string) Function for the optimazation of the weights.
        trainset: Trainset of input data.
        batchsize: (Integer) Number of the Batches it should be used while training.
        l_rate: (Float) learningrate for the training.
        device: (String) Divice that will be used for the training. Default is cpu.
    """
    trainloader = torch.utils.data.DataLoader(trainset, batch_size=batchsize, shuffle=True, num_workers=2)
    return model.train_start(num_epochs, trainloader, criterion, optimizer, l_rate, device)

def test_model(model, criterion, testset, batchsize, device = "cpu"):
    """
    Test the model and returns usefull values (will be more concrete later)

    :Parameters:
        model: (Net) Neural network that should be trained.
        criterion: (loss) Loss Function for the training.
        testset: Testset of input data.
        batchsize: (Integer) Number of the Batches it should be used while training.
        device: (String) Divice that will be used for the training. Default is cpu.
    """
    testloader = torch.utils.data.DataLoader(testset, batch_size=batchsize, shuffle=False, num_workers=2)
    return model.test_start(criterion, testloader, device)

def get_weights(model):
    """
    Returns a weights dictionary of the actual weights split in Layers from a given neural network model for saving in a json.

    :Parameters: 
        model: (Net) Neural network model from getting the weights and bias from.
    """
    weights_dict = collections.OrderedDict()
    
    for container in model.layer_settings:
        layers = model.layer_settings[container]
        weights_dict.setdefault(container, collections.OrderedDict())
        for layer in layers:
            if "Pool" in layers[layer]["type"]:
                weights_dict[container][layer] = {"settings": layers[layer]}
            else:
                layer_number = int(re.findall("\d+", layer)[0])
                layer_name = layers[layer]["type"] + str(layer_number)
                weights = model.__getattr__(container).__getattr__(layer_name).state_dict()["weight"].tolist()
                bias = model.__getattr__(container).__getattr__(layer_name).state_dict()["bias"].tolist()
                weights_dict[container][layer] = ({
                    "settings": layers[layer],
                    "weights": weights,
                    "bias": bias
                    })

    return weights_dict

def load_model_from_weights(weights_dict, input_dim, epoch = -1):
    """
    Returns a Pytorch model load from given weights dict

    :Parameters: 
        weights_dict: (Dictionary) Dictionary of layers with weights, bias and types
        input_dim: ([Integer]) Input dimension for the neural network as Array. Example: [x], [x, y], [x, y, z]
        epoch: (Integer) Wiche epoch the weights should be loaden from. Default = -1, it loads the leatest epoch.
    """
    ordered_dict = collections.OrderedDict()
    layer_build_dict = collections.OrderedDict()
    epoch_num = str(weights_dict["epochs"]) if epoch is -1 else str(epoch)
    last_epoch = "epoch_" + epoch_num
    # for every layer in the last epoch of weights_dict it creates a weights and bias tensor and add it to the ordered_dict
    for container, layers in weights_dict[last_epoch].items():
        for layer in layers:
            if not "Pool" in layers[layer]["settings"]["type"]:
                layer_number = int(re.findall("\d+", layer)[0])
                attribute_name = container + "." + layers[layer]["settings"]["type"] + str(layer_number) 

                ordered_dict[attribute_name + ".weight"] = torch.Tensor(layers[layer]["weights"])
                ordered_dict[attribute_name + ".bias"] = torch.Tensor(layers[layer]["bias"])
            layer_build_dict.setdefault(container, []).append(layers[layer]["settings"])
    
    model = create_model(input_dim, layer_build_dict)

    model.load_state_dict(ordered_dict)
    model.eval()
    return model


def get_device():
    """
    Returns "cuda:0" if cuda is available else "cpu".
    """
    return torch.device("cuda:0" if torch.cuda.is_available() else "cpu")

# for testing
# import mongo_module as mongo

# db_connection = mongo.Mongo("mongodb://localhost:27017/", "networkDB", "networks")

# if __name__ == "__main__":
#     example_layers = [
#         {"type": "conv2d", "inChannel": 1, "outChannel": 3, "kernelSize": 3, "stride": 1, "padding": 1, "activation": "relu"},
#         {"type": "maxPool2d", "kernelSize": 2, "stride": 2, "activation": "none"},
#         {"type": "conv2d", "inChannel": 3, "outChannel": 6, "kernelSize": 5, "stride": 1, "padding": 0, "activation": "relu"}]
#     layer_2 = [
#         {"type": "linear", "outChannel": 120, "activation": "none" },
#         {"type": "linear", "outChannel": 10, "activation": "none" }
#     ]

#     test_model = create_model([28, 28, 1], {"model": example_layers, "model2": layer_2})
#     print(test_model)
#     print([i for i in get_weights(test_model)])

#     for param_tensor in test_model.state_dict():
#         print(param_tensor, "\t", test_model.state_dict()[param_tensor].size())

#     transform = transforms.Compose([transforms.ToTensor(), transforms.Normalize((0.5,), (0.5,))])
#     trainset = torchvision.datasets.MNIST(root='../data', train=True, download=True, transform=transform)

#     criterion = "crossEntropy"
#     optimizer = "sgd"
#     device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")

#     train_dict = train_model(test_model, 2, criterion, optimizer, trainset, 64, 0.001, device)
#     counter = 0
#     weights = {}
#     for ep in train_dict:
#         weights["epoch_"+str(counter)] = ep
#         counter += 1
    
#     weights.update({"name": "myName2", "epochs": counter})
#     weights = db_connection.get_item_by_id("5d7b8d79d3b961d459951f2a")
#     model = load_model_from_weights(weights, [28,28])
#     weights = get_weights(model)
#     db_connection.post_item({"name": "copy", "epoch_0": weights})

#     print(train_dict)
