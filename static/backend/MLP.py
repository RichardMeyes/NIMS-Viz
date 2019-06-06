"""

"""
import ast
import json
import torch
import numpy as np
import torch.nn as nn
import torch.nn.functional as F
import torch.optim as optim
import torchvision
import torchvision.transforms as transforms
from torch.autograd import Variable
from flask_socketio import emit, send
import eventlet
import static.backend.utility as utility
import static.backend.HEATMAP as HEATMAP
import cv2


class Net(nn.Module):
    def __init__(self, num_epochs, conv_layers, layers):
        # create Net
        super(Net, self).__init__()
        self.topology_dict = dict()
        self.weights_dict = dict()
        self.filename = dict()

        self.widthLinear = 28
        self.heightLinear = 28


        # Conv Layers
        self.conv_layers = conv_layers
        for i_layer in range(len(conv_layers)):
            self.__setattr__("c{0}".format(i_layer),
                             nn.Conv2d(self.conv_layers[i_layer]["inChannel"], self.conv_layers[i_layer]["outChannel"], kernel_size=self.conv_layers[i_layer]["kernelSize"], stride=self.conv_layers[i_layer]["stride"], padding=self.conv_layers[i_layer]["padding"]))

            self.widthLinear = np.floor(((self.widthLinear - self.conv_layers[i_layer]["kernelSize"] + (2 * self.conv_layers[i_layer]["padding"])) / self.conv_layers[i_layer]["stride"]) + 1)
            self.widthLinear = np.floor(((self.widthLinear - 2) / 2) + 1)

            self.heightLinear = np.floor(((self.heightLinear - self.conv_layers[i_layer]["kernelSize"] + (2 * self.conv_layers[i_layer]["padding"])) / self.conv_layers[i_layer]["stride"]) + 1)
            self.heightLinear = np.floor(((self.heightLinear - 2) / 2) + 1)


        # FC Layers
        self.layers = layers
        self.num_epochs = num_epochs
        
        self.h0 = nn.Linear(self.conv_layers[-1]["outChannel"] * self.widthLinear * self.heightLinear, self.layers[0])
        for i_layer in range(len(layers)-1):
            self.__setattr__("h{0}".format(i_layer+1),
                             nn.Linear(self.layers[i_layer], self.layers[i_layer+1]))
        self.output = nn.Linear(self.layers[-1], 10)

    def forward(self, x):
        if len(self.conv_layers):
            x = x.view(-1, 1, 28, 28)
            for i_layer in range(len(self.conv_layers)):
                x = F.relu(self.__getattr__("c{0}".format(i_layer))(x))
                x = F.max_pool2d(x, kernel_size=2, stride=2)
            x = x.view(x.shape[0], -1)

        for i_layer in range(len(self.layers)):
            x = F.relu(self.__getattr__("h{0}".format(i_layer))(x))

        x = F.log_softmax(self.output(x), dim=1)  # needs NLLLos() loss
        return x

    def save_topology(self):
        self.topology_dict["conv_layers"] = self.conv_layers
        self.topology_dict["layers"] = self.layers
        self.topology_dict["h0Shape0"] = self.conv_layers[-1]["outChannel"] * self.widthLinear * self.heightLinear

        with open("static/data/topologies/MLP_{convLayers}_{layers}.json".format(**self.filename), "w") as f:
            json.dump(self.topology_dict, f)

    def save_weights(self):
        self.filename = {
            "convLayers": [],
            "layers": self.layers
        }
        for conv_layer in self.conv_layers:
            self.filename["convLayers"].append(conv_layer["outChannel"])


        weights = self.h0.weight.data.numpy().tolist()
        self.weights_dict = {"h0": weights}

        for i_layer in range(len(self.conv_layers)):
                layer = self.__getattr__("c{0}".format(i_layer))
                weights = layer.weight.data.numpy().tolist()
                self.weights_dict.update({"c{0}".format(i_layer): weights})

        for i_layer in range(len(self.layers)-1):
            layer = self.__getattr__("h{0}".format(i_layer+1))
            weights = layer.weight.data.numpy().tolist()
            self.weights_dict.update({"h{0}".format(i_layer+1): weights})

        weights = self.output.weight.data.numpy().tolist()
        self.weights_dict.update({"output": weights})
        
        with open("static/data/weights/MLP_{convLayers}_{layers}_untrained.json".format(**self.filename), "w") as f:
            json.dump(self.weights_dict, f)

    def train_net(self, device, trainloader, criterion, optimizer):
        log_interval = 10
        newNodeStruct = True
        isDone = False
        for epoch in range(self.num_epochs):
            for batch_idx, (data, target) in enumerate(trainloader):
                data, target = Variable(data), Variable(target)
                if device == "cuda:0":
                    data, target = data.to(device), target.to(device)
                # resize data from (batch_size, 1, 28, 28) to (batch_size, 28*28)
                data = data.view(-1, 28 * 28)
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

            # store weights after each epoch
            temp_epoch_dict = dict()
            weights = self.h0.weight.data.numpy().tolist()
            self.weights_dict["epoch_{0}".format(epoch)] = {"h0": weights}
            temp_epoch_dict["epoch_{0}".format(epoch)] = {"input": weights}

            for i_layer in range(len(self.conv_layers)):
                layer = self.__getattr__("c{0}".format(i_layer))
                weights = layer.weight.data.numpy().tolist()
                self.weights_dict["epoch_{0}".format(epoch)].update({"c{0}".format(i_layer): weights})
                temp_epoch_dict["epoch_{0}".format(epoch)].update({"c{0}".format(i_layer): weights})

            for i_layer in range(len(self.layers)-1):
                layer = self.__getattr__("h{0}".format(i_layer+1))
                weights = layer.weight.data.numpy().tolist()
                self.weights_dict["epoch_{0}".format(epoch)].update({"h{0}".format(i_layer+1): weights})
                temp_epoch_dict["epoch_{0}".format(epoch)].update({"h{0}".format(i_layer+1): weights})

            weights = self.output.weight.data.numpy().tolist()
            self.weights_dict["epoch_{0}".format(epoch)].update({"output": weights})
            temp_epoch_dict["epoch_{0}".format(epoch)].update({"output": weights})
            # return partial done epochs via socketIO (each epoch gets added to the dict)
            # create heatmap
            if(epoch > 0):
                newNodeStruct = False

            weightMinMax, heatmapEpochData = self.calcHeatmapFromFile(temp_epoch_dict["epoch_{0}".format(epoch)], newNodeStruct)
            if(epoch == self.num_epochs - 1):
                isDone = True
                emit('json',{'done': isDone, 'resultWeights' : self.weights_dict, 'resultHeatmapData': heatmapEpochData, 'resultWeightMinMax': weightMinMax})
            else:
                emit('json',{'done': isDone, 'resultWeights' : temp_epoch_dict, 'resultHeatmapData': heatmapEpochData, 'resultWeightMinMax': weightMinMax})
            eventlet.sleep(0)
            print('emitted data')

        #save weights
        with open("static/data/weights/MLP_{convLayers}_{layers}.json".format(**self.filename), "w") as f:
            json.dump(self.weights_dict, f)

        # save trained net
        torch.save(self.state_dict(), 'static/data/models/MLP_{convLayers}_{layers}_trained.pt'.format(**self.filename))

    def test_net(self, criterion, testloader, device):
        # test the net
        test_loss = 0
        correct = 0
        correct_class = np.zeros(10)
        correct_labels = np.array([], dtype=int)
        class_labels = np.array([], dtype=int)
        for i_batch, (data, target) in enumerate(testloader):
            data, target = Variable(data), Variable(target)
            # data, target = data.to(device), target.to(device)
            data = data.view(-1, 28 * 28)
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

    def test_net_digit(self, digit):
        net_out = self(digit)
        pred = net_out.data.max(1)[1]

        return pred

    def calcHeatmapFromFile(self, epochWeights, newNodeStruct):
        drawFully = False
        weightMinMax = [0,0]
        weightMinMax = utility.getWeightsFromEpoch(epochWeights,weightMinMax)
        print('weightMinMax in mlp: ', weightMinMax)
        density = 5
        heatmapObj = HEATMAP.Heatmap()

        return weightMinMax, heatmapObj.heatmapFromWeights(epochWeights, weightMinMax, drawFully, newNodeStruct, density)


def mlp(batch_size_train, batch_size_test, num_epochs, learning_rate, conv_layers, layers):
    # prepare GPU
    device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
    print(device)

    # build net
    net = Net(num_epochs=num_epochs, conv_layers=conv_layers, layers=layers)
    criterion = nn.NLLLoss()  # nn.CrossEntropyLoss()
    optimizer = optim.SGD(net.parameters(), lr=learning_rate, momentum=0.9)

    # load data
    transform = transforms.Compose([transforms.ToTensor(), transforms.Normalize((0.5,), (0.5,))])
    trainset = torchvision.datasets.MNIST(root='../data', train=True, download=True, transform=transform)
    trainloader = torch.utils.data.DataLoader(trainset, batch_size=batch_size_train, shuffle=True, num_workers=2)
    testset = torchvision.datasets.MNIST(root='../data', train=False, download=True, transform=transform)
    testloader = torch.utils.data.DataLoader(testset, batch_size=batch_size_test, shuffle=False, num_workers=2)

    net.save_weights()

    net.train_net(device, trainloader, criterion, optimizer)
    # acc = net.test_net(device, testloader, criterion)

    net.save_topology()

    # return net, acc, net.weights_dict


def mlp_ablation(topology, filename, ko_layers, ko_units):
    device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")

    net = Net(num_epochs=0, conv_layers=topology["conv_layers"], layers=topology["layers"])
    # net.to(device)
    net.load_state_dict(torch.load("static/data/models/{0}_trained.pt".format(filename)))
    net.eval()
    criterion = nn.NLLLoss()  # nn.CrossEntropyLoss()

    transform = transforms.Compose([transforms.ToTensor(), transforms.Normalize((0.5,), (0.5,))])
    testset = torchvision.datasets.MNIST(root='../data', train=False, download=True, transform=transform)
    testloader = torch.utils.data.DataLoader(testset, batch_size=16, shuffle=False, num_workers=2)

    ko_layers = map(lambda x: x - len(topology["conv_layers"]), ko_layers)
    
    for i_layer, i_unit in zip(ko_layers, ko_units):
        print("knockout layer {0}, unit {1}".format(i_layer, i_unit))
        n_inputs = topology["layers"][i_layer-1] if i_layer != 0 else topology["h0Shape"]
        net.__getattr__("h{0}".format(i_layer)).weight.data[i_unit, :] = torch.zeros(n_inputs)
        net.__getattr__("h{0}".format(i_layer)).bias.data[i_unit] = 0
    acc, correct_labels, acc_class, class_labels = net.test_net(criterion, testloader, device)

    return acc, correct_labels, acc_class, class_labels


def test_digit(topology, filename):
    digit = cv2.imread("static/data/digit/digit.png", cv2.IMREAD_GRAYSCALE)
    digit = cv2.resize(digit, (28, 28))

    digit = digit / 255.0
    digit[digit == 0] = -1
    digit = torch.from_numpy(digit).float()
    digit = digit.view(-1, 28 * 28)

    device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")

    net = Net(num_epochs=0, conv_layers=topology["conv_layers"], layers=topology["layers"])
    net.load_state_dict(torch.load("static/data/models/{0}_trained.pt".format(filename)))
    net.eval()
    criterion = nn.NLLLoss()  # nn.CrossEntropyLoss()


    # ko_layers = map(lambda x: x - len(topology["conv_layers"]), ko_layers)
    
    # for i_layer, i_unit in zip(ko_layers, ko_units):
    #     print("knockout layer {0}, unit {1}".format(i_layer, i_unit))
    #     n_inputs = topology["layers"][i_layer-1] if i_layer != 0 else topology["h0Shape"]
    #     net.__getattr__("h{0}".format(i_layer)).weight.data[i_unit, :] = torch.zeros(n_inputs)
    #     net.__getattr__("h{0}".format(i_layer)).bias.data[i_unit] = 0


    pred = net.test_net_digit(digit)

    return pred

# def mlpContinue():
#     net.train_net(device, trainloader, criterion, optimizer)
#     acc = net.test_net(device, testloader, criterion)


if __name__ == "__main__":

    net, acc, _ = mlp(layers=(40, 40, 40), learning_rate=0.001, batch_size_train=64, batch_size_test=16, num_epochs=10)
    print(acc)