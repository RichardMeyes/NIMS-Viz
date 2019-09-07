import torch
import torchvision
import json
import cv2

import torch.nn as nn
import torch.optim as optim
import torchvision.transforms as transforms
import torch.nn.functional as F
import numpy as np
import collections

from torch.autograd import Variable


class Net(nn.Module):
    '''
    Neural Network that can be user definable.

    :Parameters: 
        input_dim: ([Integer]) Input dimension for the neural network as Array. Example: [x], [x, y], [x, y, z]
        layers: ([Dictionary]) List of Dictionarys of layer settings. Example: {"type": "conv2d", "inChannel": 1, "outChannel": 3, "kernelSize": 3, "stride": 1, "padding": 0 "activation": "relu"}
    
    :Global attributes:
        activations: (Dictionary) Dictionary of activation function so it can be called with a string.
    '''
    __activations = {
    'relu': F.relu,
    'sigmoid': F.sigmoid,
    'tanh': F.tanh,
    'softmax': F.softmax
    }
    
    def __init__(self, input_dim = [], layers = []):
        super(Net, self).__init__()

        dim_list = []
        if len(input_dim) is 1:
            dim_list.append([input_dim[0], 1, 1])
        elif len(input_dim) is 2:
            dim_list.append([input_dim[0], input_dim[1], 1])
        else:
            dim_list.append([input_dim[0], input_dim[1], input_dim[2]])

        self.layer_settings = collections.OrderedDict()

        layer_counter = 0
        for layer in layers:
            if layer["type"] is "conv2d":
                self.__setattr__("conv2d{0}".format(layer_counter), nn.Conv2d(layer["inChannel"], layer["outChannel"], layer["kernelSize"], layer["stride"], layer["padding"]))

                new_width = np.floor( ( ( (dim_list[layer_counter][0] - layer["kernelSize"]) + (2 * layer["padding"]) ) / layer["stride"] ) + 1 )
                new_height = np.floor( ( ( (dim_list[layer_counter][1] - layer["kernelSize"]) + (2 * layer["padding"]) ) / layer["stride"] ) + 1 )
                dim_list.append([new_width, new_height, layer["outChannel"]])

                self.layer_settings["layer_"+ str(layer_counter)] = layer
            
            elif layer["type"] is "maxPool2d":
                self.__setattr__("maxPool2d{0}".format(layer_counter), nn.MaxPool2d(layer["kernelSize"], stride = layer["stride"]))

                new_width = np.floor( ( ( (dim_list[layer_counter][0] - layer["kernelSize"])  ) / layer["stride"] ) + 1 )
                new_height = np.floor( ( ( (dim_list[layer_counter][1] - layer["kernelSize"])  ) / layer["stride"] ) + 1 )
                dim_list.append([new_width, new_height, layer["outChannel"]])

                self.layer_settings["layer_"+ str(layer_counter)] = layer

            elif layer["type"] is "linear":
                self.__setattr__("linear{0}".format(layer_counter), nn.Linear(np.prod(dim_list[layer_counter]), layer["outChannel"]))

                dim_list.append(layer["outChannel"], 1, 1)

                self.layer_settings["layer_"+ str(layer_counter)] = layer
            
            layer_counter += 1

    def forward(self, x):
        layer_counter = 0
        is_linear = False
        # x = x.view(-1, 1, 28, 28) is it necessary?
        for layer in self.layer_settings:
            if layer["type"] is "linear" and not is_linear:
                x = x.view(x.shape[0], -1)
                is_linear = True
            if layer["activation"] is "none":
                activation = Net.__activations[layer["activation"]]
                x = activation(self.__getattr__(layer["type"] + str(layer_counter))(x))
            else:
                x = self.__getattr__(layer["type"] + str(layer_counter))(x)

            layer_counter += 1
        
        return x

    def training(self, num_epochs, trainloader, criterion, optimizer, device = "cpu"):
        '''
        Train the neural network and returns a list with a dictionary for each epoch with weights.

        :Parameters:
            num_epochs: (Integer) Number of epochs the network should be trained.
            device: (String) Divice that will be used for the training. Default is cpu.
            trainloader: (trainloader) Train data the model should be trained for.
            criterion: (nn.Loss_Function) Loss Function for the training.
            optimizer: (nn.optim.function) Function for the optimazation of the weights.
        '''
        log_interval = 10

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

            #stores the weights into epoch_weights_dict
            epoch_weights_list.append(get_weights(self))

        return epoch_weights_list

    def testing(self, criterion, testloader, device = "cpu"):
        # test the net
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
        '''
        Returns the prediction of the model

        :Parameters:
            _input: Input that should give a predictions.
        '''
        return self(_input).tolist()

def create_model(input_dim, layers):
    '''
    Creates and Return a neural network model for given input.

    :Parameters:
         input_dim: ([Integer]) Input dimension for the neural network as Array. Example: [x], [x, y], [x, y, z]
        layers: ([Dictionary]) List of Dictionarys of layer settings. Example: {"type": "conv2d", "inChannel": 1, "outChannel": 3, "kernelSize": 3, "stride": 1, "padding": 0 "activation": "relu"}
    '''
    return Net(input_dim, layers)

def train_model(model, num_epochs, criterion, optimizer, trainset, batchsize, device = "cpu"):
    '''
    Trains a given model and returns for each epochs a list of layer dictionary with weights.

    :Parameters:
        model: (Net) Neural network that should be trained.
        num_epochs: (Integer) Number of epochs the network should be trained.
        criterion: (nn.Loss_Function) Loss Function for the training.
        optimizer: (nn.optim.function) Function for the optimazation of the weights.
        trainset: Trainset of input data.
        batchsize: (Integer) Number of the Batches it should be used while training.
        device: (String) Divice that will be used for the training. Default is cpu.
    '''
    trainloader = torch.utils.data.DataLoader(trainset, batch_size=batchsize, shuffle=True, num_workers=2)
    return model.training(num_epochs, trainloader, criterion, optimizer, device)

def test_model(model, criterion, testset, batchsize, device = "cpu"):
    '''
    Test the model and returns usefull values (will be more concrete later)

    :Parameters:
        model: (Net) Neural network that should be trained.
        criterion: (nn.Loss_Function) Loss Function for the training.
        testset: Testset of input data.
        batchsize: (Integer) Number of the Batches it should be used while training.
        device: (String) Divice that will be used for the training. Default is cpu.
    '''
    testloader = torch.utils.data.DataLoader(testset, batch_size=batchsize, shuffle=False, num_workers=2)
    return model.testing(criterion, testloader, device)

def get_weights(model):
    '''
    Returns a weights dictionary of the actual weights split in Layers from a given neural network model for saving in a json.

    :Parameters: 
        model: (Net) Neural network model from getting the weights and bias from.
    '''
    weights_dict = collections.OrderedDict()
    layer_counter = 0
    for param in model.parameters():
        current_layer = "layer_" + str(layer_counter)
        weights_dict.setdefault(current_layer, {})
        # BIAS have the output size of the CNNs or MLPs and len() is 1
        if len(list(param.data.size())) is 1:
            weights_dict[current_layer].update({"bias": param.data.tolist()})
            layer_counter += 1
        else:
            weights_dict[current_layer].update({"settings": model.layer_settings[current_layer]})
            weights_dict[current_layer].update({"weights": param.data.tolist()})

    return weights_dict

def load_model_from_weights(weights_dict, input_dim):
    '''
    Returns a Pytorch model load from given weights dict

    :Parameters: 
        weights_dict: (Dictionary) Dictionary of layers with weights, bias and types
        input_dim: ([Integer]) Input dimension for the neural network as Array. Example: [x], [x, y], [x, y, z]
    '''
    ordered_dict = collections.OrderedDict()
    layer_settings_list = []
    # for every layer in the weights_dict it creates a weights and bias tensor and add it to the ordered_dict
    for i in range(len(weights_dict)):
        layer = "layer_" + str(i)
        attribute_name = weights_dict[layer]["settings"]["type"] + str(i)
        ordered_dict[attribute_name + ".weight"] = torch.Tensor(weights_dict[layer]["weights"])
        ordered_dict[attribute_name + ".bias"] = torch.Tensor(weights_dict[layer]["bias"])
        layer_settings_list.append(weights_dict[layer]["settings"])
    
    model = Net(input_dim, layer_settings_list)
    model.load_state_dict(ordered_dict)
    model.eval()
    return model

# Test the ablated network.
# #refactoring later
# def mlp_ablation(topology, filename, ko_layers, ko_units):
#     device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")

#     net = Net(num_epochs=0, conv_layers=topology["conv_layers"], layers=topology["layers"])
#     # net.to(device)
#     net.load_state_dict(torch.load("static/data/models/{0}_trained.pt".format(filename)))
#     net.eval()
#     criterion = nn.NLLLoss()  # nn.CrossEntropyLoss()

#     transform = transforms.Compose([transforms.ToTensor(), transforms.Normalize((0.5,), (0.5,))])
#     testset = torchvision.datasets.MNIST(root='../data', train=False, download=True, transform=transform)
#     testloader = torch.utils.data.DataLoader(testset, batch_size=16, shuffle=False, num_workers=2)

#     print(net.h0.in_features)

    
#     for i_layer, i_unit in zip(ko_layers, ko_units):
#         if i_layer < len(topology["conv_layers"]):
#             print("knockout Conv layer {0}, unit {1}".format(i_layer, i_unit))

#             n_inputs = net.__getattr__("c{0}".format(i_layer)).weight.data[i_unit].shape
#             net.__getattr__("c{0}".format(i_layer)).weight.data[i_unit, :] = torch.zeros(n_inputs)
#             net.__getattr__("c{0}".format(i_layer)).bias.data[i_unit] = 0
#         else:
#             i_layer = i_layer - len(topology["conv_layers"])
#             print("knockout FC layer {0}, unit {1}".format(i_layer, i_unit))

#             n_inputs = topology["layers"][i_layer-1] if i_layer != 0 else net.h0.in_features
#             net.__getattr__("h{0}".format(i_layer)).weight.data[i_unit, :] = torch.zeros(n_inputs)
#             net.__getattr__("h{0}".format(i_layer)).bias.data[i_unit] = 0


#     acc, correct_labels, acc_class, class_labels = net.test_net(criterion, testloader, device)

#     return acc, correct_labels, acc_class, class_labels


# # Test the free-drawing drawing on the ablated network.
# def test_digit(topology, filename, ko_layers, ko_units):
#     digit = cv2.imread("static/data/digit/digit.png", cv2.IMREAD_GRAYSCALE)
#     digit = cv2.resize(digit, (28, 28))

#     digit = digit / 255.0
#     digit[digit == 0] = -1
#     digit = torch.from_numpy(digit).float()
#     digit = digit.view(-1, 28 * 28)

#     device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")

#     net = Net(28, 28, conv_layers=topology["conv_layers"], layers=topology["layers"])
#     net.load_state_dict(torch.load("static/data/models/{0}_trained.pt".format(filename)))
#     net.eval()
#     criterion = nn.NLLLoss()  # nn.CrossEntropyLoss()


#     for i_layer, i_unit in zip(ko_layers, ko_units):
#         if i_layer < len(topology["conv_layers"]):
#             print("knockout Conv layer {0}, unit {1}".format(i_layer, i_unit))

#             n_inputs = net.__getattr__("c{0}".format(i_layer)).weight.data[i_unit].shape
#             net.__getattr__("c{0}".format(i_layer)).weight.data[i_unit, :] = torch.zeros(n_inputs)
#             net.__getattr__("c{0}".format(i_layer)).bias.data[i_unit] = 0
#         else:
#             i_layer = i_layer - len(topology["conv_layers"])
#             print("knockout FC layer {0}, unit {1}".format(i_layer, i_unit))

#             n_inputs = topology["layers"][i_layer-1] if i_layer != 0 else net.h0.in_features
#             net.__getattr__("h{0}".format(i_layer)).weight.data[i_unit, :] = torch.zeros(n_inputs)
#             net.__getattr__("h{0}".format(i_layer)).bias.data[i_unit] = 0


#     net_out = net.test_net_digit(digit)

#     return net_out, net.nodes_dict