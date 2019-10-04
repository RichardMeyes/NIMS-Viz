export class Dropdown {
}

export enum LossFunction {
    crossEntropy = 'crossEntropy',
    nLogLikelihood = 'nLogLikelihood',
    mse = 'mse'
}

export const LossFunctionMapping: Record<LossFunction, string> = {
    [LossFunction.crossEntropy]: 'Cross Entropy Loss',
    [LossFunction.nLogLikelihood]: 'Negativ Log-Likelihood',
    [LossFunction.mse]: 'MSE'
};
