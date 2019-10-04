import torch


def ablate_unit(net, layer, i_unit):
    if layer in ["linear"]:
        net.state_dict()[layer + ".weight"][i_unit]\
            .copy_(torch.zeros(net.state_dict()[layer + ".weight"].shape[1]))
        net.state_dict()[layer + ".bias"][i_unit].copy_(torch.tensor(0))
    else:
        dim = net.state_dict()[layer + ".weight"][i_unit].size
        net.state_dict()[layer + ".weight"][i_unit, :, :, :].copy_(torch.zeros((dim[1], dim[2])))
        net.state_dict()[layer + ".bias"][i_unit].copy_(torch.tensor(0))


if __name__ == "__main__":
    pass
