export class TestResult {
    constructor(
        public labels: string[],
        public classLabels: number[],
        public averageAccuracy: number,
        public classSpecificAccuracy: number[],
        public colorLabels: number[],
        public isInitChart: boolean = false
    ) { }
}
