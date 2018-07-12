"""

"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import torch.optim as optim
import torchvision
import torchvision.transforms as transforms
from torch.autograd import Variable


class Net(nn.Module):
    def __init__(self, layers, num_epochs):
        self.layers = layers
        self.num_epochs = num_epochs

        # create Net
        super(Net, self).__init__()
        self.input = nn.Linear(28 * 28, self.layers[0])
        for i_layer in range(len(layers)-1):
            self.__setattr__("h{0}".format(i_layer+1), nn.Linear(self.layers[i_layer], self.layers[i_layer+1]))
        self.__setattr__("h{0}".format(len(self.layers)), nn.Linear(self.layers[-1], self.layers[-1]))
        self.output = nn.Linear(self.layers[-1], 10)

    def forward(self, x):
        x = F.relu(self.input(x))
        for i_layer in range(len(self.layers)):
            x = F.relu(self.__getattr__("h{0}".format(i_layer+1))(x))
        x = F.log_softmax(self.output(x), dim=1)  # needs NLLLos() loss
        return x

    def train_net(self, device, trainloader, criterion, optimizer):
        log_interval = 10
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
        # save trained net
        torch.save(self.state_dict(), 'MLP.pt')

    def test_net(self, device, testloader, criterion):
        # test the net
        test_loss = 0
        correct = 0
        for data, target in testloader:
            data, target = Variable(data), Variable(target)
            if device == "cuda:0":
                data, target = data.to(device), target.to(device)
            data = data.view(-1, 28 * 28)
            net_out = self(data)
            # sum up batch loss
            test_loss += criterion(net_out, target).data.item()
            pred = net_out.data.max(1)[1]  # get the index of the max log-probability
            correct += pred.eq(target.data).sum().item()
        test_loss /= len(testloader.dataset)
        print('\nTest set: Average loss: {:.4f}, Accuracy: {}/{} ({:.2f}%)\n'.format(test_loss, correct,
                                                                                     len(testloader.dataset),
                                                                                     100. * correct / len(
                                                                                         testloader.dataset)))
        accuracy = 100. * correct / len(testloader.dataset)
        return accuracy


def mlp(layers, learning_rate, batch_size_train, batch_size_test, num_epochs):
    # prepare GPU
    device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
    print(device)

    # build net
    net = Net(layers=layers, num_epochs=num_epochs)
    criterion = nn.NLLLoss()  # nn.CrossEntropyLoss()
    optimizer = optim.SGD(net.parameters(), lr=learning_rate, momentum=0.9)

    # load data
    transform = transforms.Compose([transforms.ToTensor(), transforms.Normalize((0.5, 0.5, 0.5), (0.5, 0.5, 0.5))])
    trainset = torchvision.datasets.MNIST(root='../data', train=True, download=True, transform=transform)
    trainloader = torch.utils.data.DataLoader(trainset, batch_size=batch_size_train, shuffle=True, num_workers=2)
    testset = torchvision.datasets.MNIST(root='../data', train=False, download=True, transform=transform)
    testloader = torch.utils.data.DataLoader(testset, batch_size=batch_size_test, shuffle=False, num_workers=2)

    net.train_net(device, trainloader, criterion, optimizer)
    acc = net.test_net(device, testloader, criterion)

    return acc


if __name__ == "__main__":

    acc = mlp(layers=(40, 40, 40), learning_rate=0.001, batch_size_train=64, batch_size_test=16, num_epochs=10)
    print(acc)