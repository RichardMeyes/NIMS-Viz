export class Playground {
    problems: SelectForm[];

    // polynomial-regression
    numOfIteration: number;
    learningRates: SelectForm[];
    optimizers: SelectForm[];


    constructor() {
        this.problems = [
            new SelectForm("polynomial-regression", "Polynomial Regression"),
            new SelectForm("mnist", "MNIST")
        ];


        // polynomial-regression
        this.numOfIteration = 75;
        this.learningRates = [
            new SelectForm("0.0001", "0.0001"),
            new SelectForm("0.001", "0.001"),
            new SelectForm("0.01", "0.01"),
            new SelectForm("0.03", "0.03"),
            new SelectForm("0.1", "0.1"),
            new SelectForm("0.3", "0.3"),
            new SelectForm("1", "1"),
            new SelectForm("3", "3"),
            new SelectForm("10", "10")
        ];
        this.optimizers = [
            new SelectForm("sgd", "Stochastic Gradient Descent"),
            new SelectForm("momentum", "Momentum"),
            new SelectForm("adagrad", "Adagrad"),
            new SelectForm("adadelta", "Adadelta"),
            new SelectForm("adam", "Adam"),
            new SelectForm("adamax", "AdaMax"),
            new SelectForm("rmsprop", "RMSprop")
        ];
    }
}

class SelectForm {
    constructor(public value: string, private viewValue: string) { }
}
