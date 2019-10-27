import torchvision
import torchvision.transforms as transforms

DATA = {
    "mnist": torchvision.datasets.MNIST,
    "kmnist": torchvision.datasets.KMNIST,
    "fashion-mnist": torchvision.datasets.FashionMNIST
}

TRANSFORM = transforms.Compose([transforms.ToTensor(), transforms.Normalize((0.5,), (0.5,))])

def get_dataset_from_torch(data_name, is_training = True):
    """
    Returns a dataset for a given dataset name.

    :Parameters:
        data_name: (string) Name of the dataset to load.
        is_training: (boolean) Flag for loading traindataset or testdataset. True by default.
    """
    return DATA[data_name](root='../data', train=is_training, download=True, transform=TRANSFORM)

def get_dataset_classes(dataset):
    """
    Returns the labels of a given dataset

    :Parameters:
        dataset: (torchvision.dataset) A torchvision dataset.
    """
    return dataset.classes

if __name__ == "__main__":
    pass