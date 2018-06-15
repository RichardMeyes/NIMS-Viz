export class Playground {
    problems: SelectForm[];
    selectedProblem: string;


    constructor() {
        this.problems = [
            new SelectForm("polynomial-regression", "Polynomial Regression"),
            new SelectForm("mnist", "MNIST")
        ];
        this.selectedProblem = "polynomial-regression";
    }
}

class SelectForm {
    constructor(private value: string, private viewValue: string) { }
}
