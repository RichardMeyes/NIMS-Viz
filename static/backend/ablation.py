import torch


def ablate_unit(net, layer, i_unit):
    if layer in ["fc2", "fc1"]:
        net.state_dict()[layer + ".weight"][i_unit]\
            .copy_(torch.zeros(net.state_dict()[layer + ".weight"].shape[1]))
        net.state_dict()[layer + ".bias"][i_unit].copy_(torch.tensor(0))
    else:
        net.state_dict()[layer + ".weight"][i_unit, :, :, :].copy_(torch.zeros((5, 5)))
        net.state_dict()[layer + ".bias"][i_unit].copy_(torch.tensor(0))


if __name__ == "__main__":
    pass
