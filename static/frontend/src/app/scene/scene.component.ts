import { Component, OnInit, ViewChild, AfterViewInit, HostListener, Renderer2, Input, AfterViewChecked, ChangeDetectorRef } from '@angular/core';
import { NetworkService } from '../network.service';

import * as THREE from 'three';
import * as Stats from 'stats.js/build/stats.min.js';
import * as simpleheat from 'simpleheat/simpleheat.js';
import * as tf from '@tensorflow/tfjs';
import { Chart } from "chart.js";

import '../../customs/enable-three-examples.js';
import 'three/examples/js/loaders/OBJLoader.js';
import 'three/examples/js/controls/OrbitControls';

import { BrainComponent } from './brain/brain.component';
import { PlaygroundService } from '../playground.service';
import { generate } from 'rxjs';
import { update } from '@tensorflow/tfjs-layers/dist/variables';
import { Playground } from '../playground.model';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';


@Component({
  selector: 'app-scene',
  templateUrl: './scene.component.html',
  styleUrls: ['./scene.component.scss']
})
export class SceneComponent implements OnInit, AfterViewInit {

  @ViewChild('snav') snav;
  @ViewChild('canvas') private canvasRef;
  @ViewChild('brainComponent') brainComponent;
  @ViewChild('moleculeComponent') moleculeComponent;
  @Input() fixedTopGap: boolean;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: THREE.OrbitControls;

  private cube: THREE.Mesh;

  private windowWidth: number;
  private windowHeight: number;
  private fieldOfView = 45;
  private nearClippingPane = 1;
  private farClippingPane = 2000;

  private weights: any;

  private showBrainView = true;

  private get canvas(): HTMLCanvasElement {
    return this.canvasRef.nativeElement;
  }

  files = [
    { value: 'model1.h5', viewValue: 'File 1' },
    { value: 'model2.h5', viewValue: 'File 2' },
    { value: 'model3.h5', viewValue: 'File 3' }
  ];

  private selectedFile;

  minOpac = 40;

  epochRange = [25, 60];

  colors: string[] = [
    '#FF6633',
    '#FFB399',
    '#FF33FF',
    '#FFFF99',
    '#00B3E6',
    '#E6B333',
    '#3366E6',
    '#999966',
    '#99FF99',
    '#B34D4D',
    '#80B300',
    '#809900',
    '#E6B3B3',
    '#6680B3',
    '#66991A',
    '#FF99E6',
  ];
  color1: string;
  color2: string;
  color3: string;

  col1Trigger = 40;
  col2Trigger = 65;
  col3Trigger = 100;





  @HostListener('window:resize', ['$event'])
  onResize(event) {
    // this.windowWidth = window.innerWidth;
    // this.windowHeight = window.innerHeight;

    // this.camera.aspect = this.windowWidth / this.windowHeight;
    // this.camera.updateProjectionMatrix();

    // this.renderer.setSize(this.windowWidth, this.windowHeight);
  }

  constructor(
    private networkService: NetworkService,
    private renderer2: Renderer2,
    private playgroundService: PlaygroundService,
    private changeDetector: ChangeDetectorRef,
    private fb: FormBuilder
  ) {
    // this.networkService.loadFromJson().subscribe(
    //   (weights) => {
    //     this.weights = weights;
    //     console.log(this.weights);
    //     this.networkService.createNetworkFromWeights(this.weights);
    //   }
    // );
    this.createForm();
  }

  ngOnInit() {
    // this.selectedFile = this.files[0].value;
    // console.log('ngOnInit');
    // this.setupScene();
    // this.setupCamera();
    // this.setupRenderer();
    // this.setupUtilities();
  }

  private startCalc() {
    console.log('quick test', this.selectedFile);

  }

  private testFunction() {
    this.brainComponent.createConnectionsBetweenLayers(this.weights,
      this.networkService.getLayerObj,
      this.networkService.getNetworkReductionFactor);

  }

  public toggle() {
    this.snav.toggle();
  }

  ngAfterViewInit() {
    this.generateData();
    this.beforeTraining(false);
  }

  private setupScene() {
    this.scene = new THREE.Scene();

    if (this.showBrainView) {
      // this.brainComponent.ngOnInit();
    } else {
      // this.moleculeComponent.ngOnInit();
    }

    /*let objectLoader = new THREE.OBJLoader();
    objectLoader.load("../../assets/models/obj/Brain_Model.obj",
      (obj) => {
        obj.traverse(function (child) {
          if (child instanceof THREE.Mesh) {
            // child.material = brainMaterial;
          }
        });

        obj.position.y = -0.5;
        obj.rotation.y = Math.PI / 2;
        this.scene.add(obj);
      },
      (xhr) => { console.log((xhr.loaded / xhr.total * 100) + '% loaded'); },
      (err) => { console.error('An error happened'); }
    );*/
  }

  private setupCamera() {
    const aspectRatio = this.getAspectRatio();
    this.camera = new THREE.PerspectiveCamera(
      this.fieldOfView,
      aspectRatio,
      this.nearClippingPane,
      this.farClippingPane
    );
    this.camera.position.z = 3;
    this.scene.add(this.camera);

    const ambientLight = new THREE.AmbientLight(0x444444);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffeedd);
    this.camera.add(directionalLight);
  }

  private setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true
    });
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);

    const component: SceneComponent = this;
    (function render() {
      requestAnimationFrame(render);
      component.renderer.render(component.scene, component.camera);
    }());
  }

  private setupUtilities() {
    // ==================================================
    // controls
    // ==================================================
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.rotateSpeed = 1.0;
    this.controls.zoomSpeed = 1.2;
  }

  private getAspectRatio(): number {
    return window.innerWidth / window.innerHeight;
  }


  // ==================================================
  // playground
  // ==================================================
  playgroundForm: FormGroup;
  playgroundData: Playground = new Playground();

  createForm() {
    this.playgroundForm = this.fb.group({
      problem: ["", Validators.required],
      learningRate: ["", Validators.required],
      numOfIteration: [0, Validators.required],
      optimizer: ["", Validators.required],
    });


    this.playgroundForm.setValue({
      problem: this.playgroundData.problems[0].value,
      learningRate: this.playgroundData.learningRates[0].value,
      numOfIteration: this.playgroundData.numOfIteration,
      optimizer: this.playgroundData.optimizers[0].value
    });
  }

  optimizer;

  // selectedProblem = "polynomial-regression";
  // numIterations = 75;
  // learningRate = 0.5;
  // optimizer = tf.train.sgd(this.learningRate);




  trueCoefficients; trainingData;
  randomCoefficients;
  trainingPredictions;
  a; b; c; d;



  layerCount = 1;
  nodeCount = 1;

  beforeChart; predictionChart;


  @ViewChild('dataCoeff') private dataCoeffRef;
  @ViewChild('randomCoeff') private randomCoeffRef;
  @ViewChild('trainedCoeff') private trainedCoeffRef;

  @ViewChild('dataCanvas') private dataCanvasRef;
  @ViewChild('randomCanvas') private randomCanvasRef;
  @ViewChild('trainedCanvas') private trainedCanvasRef;


  // mnist  

  modelTypes = [
    { value: 'sequential', viewValue: 'Sequential' },
    { value: 'model', viewValue: 'Model (currently not supported)' }
  ];
  selectedModelType = "sequential";

  layerTypes = [
    { value: 'basic', viewValue: 'Basic' },
    { value: 'convolutional', viewValue: 'Convolutional' },
    { value: 'pooling', viewValue: 'Pooling' }
  ];
  selectedLayerType: string[] = [];


  model;
  batchSize = 64;
  trainBatches = 150;
  testBatchSize = 1000;
  testIterationFrequency = 5;
  epochs = 1;
  data;
  @ViewChild('divStatus') private divStatusRef;
  @ViewChild('trainNetwork') private trainNetworkRef;
  trainNetworkDisabled = false;
  modelWeightsEveryBatch;


  renderCoefficients(container, coeff) {
    container.nativeElement.innerHTML =
      `<span>a=${coeff.a.toFixed(3)}, b=${coeff.b.toFixed(3)}, c=${
      coeff.c.toFixed(3)},  d=${coeff.d.toFixed(3)}</span>`;
  }

  generateData() {
    this.trueCoefficients = { a: -.8, b: -.2, c: .9, d: .5 };
    this.trainingData = this.playgroundService.generateData(100, this.trueCoefficients);
    this.renderCoefficients(this.dataCoeffRef, this.trueCoefficients);
    this.plotData(this.dataCanvasRef, this.trainingData);
  }

  beforeTraining(reset: boolean) {
    this.a = tf.variable(tf.scalar(Math.random()));
    this.b = tf.variable(tf.scalar(Math.random()));
    this.c = tf.variable(tf.scalar(Math.random()));
    this.d = tf.variable(tf.scalar(Math.random()));

    this.randomCoefficients = { a: this.a, b: this.b, c: this.c, d: this.d };
    let randomCoefficientsData = {
      a: this.a.dataSync()[0],
      b: this.b.dataSync()[0],
      c: this.c.dataSync()[0],
      d: this.d.dataSync()[0],
    };

    this.renderCoefficients(this.randomCoeffRef, randomCoefficientsData);
    const predictionsBefore = this.playgroundService.predict(this.trainingData.xs, this.randomCoefficients);
    if (reset) { this.updatePrediction(this.trainingData, predictionsBefore, this.beforeChart); }
    else { this.plotDataAndPredictions(this.randomCanvasRef, this.trainingData, predictionsBefore, true); }

    predictionsBefore.dispose();
  }

  trainNetwork() {
    let numOfIteration = this.playgroundForm.get('numOfIteration').value;
    this.optimizer = tf.train.sgd(+this.playgroundForm.get('learningRate').value);

    if (this.playgroundForm.get('problem').value == "polynomial-regression") {
      if (this.predictionChart) { this.predictionChart.destroy(); }

      this.trainingPredictions = [];

      for (let iter = 0; iter < numOfIteration; iter++) {
        this.optimizer.minimize(() => {
          const pred = this.playgroundService.predict(this.trainingData.xs, this.randomCoefficients);
          this.trainingPredictions.push(tf.variable(pred));
          return this.playgroundService.loss(pred, this.trainingData.ys);
        });
        tf.nextFrame();
      }

      let trainedCoefficientsData = {
        a: this.a.dataSync()[0],
        b: this.b.dataSync()[0],
        c: this.c.dataSync()[0],
        d: this.d.dataSync()[0],
      };

      this.renderCoefficients(this.trainedCoeffRef, trainedCoefficientsData);

      for (let iter = 0; iter < numOfIteration; iter++) {
        if (iter == 0) { this.plotDataAndPredictions(this.trainedCanvasRef, this.trainingData, this.trainingPredictions[iter], false); }
        else {
          setTimeout(() => {
            this.updatePrediction(this.trainingData, this.trainingPredictions[iter], this.predictionChart);
          }, 150 * iter);
        }
      }
    }
    else if (this.playgroundForm.get('problem').value == "mnist") {
      this.setupModel();
      this.trainModel();
    }
  }

  async trainModel() {
    this.SetStatus("Training...");

    // We'll keep a buffer of loss and accuracy values over time.
    const lossValues = [];
    const accuracyValues = [];

    // Iteratively train our model on mini-batches of data.
    for (let i = 0; i < this.trainBatches; i++) {
      // const [batch, validationData] = tf.tidy(() => {
      const batch = this.playgroundService.nextTrainBatch(this.batchSize);
      // batch.xs = batch.xs.reshape<any>([this.batchSize, 28, 28, 1]);

      let validationData;
      // Every few batches test the accuracy of the model.
      if (i % this.testIterationFrequency === 0) {
        const testBatch = this.playgroundService.nextTestBatch(this.testBatchSize);
        validationData = [
          // Reshape the training data from [64, 28x28] to [64, 28, 28, 1] so
          // that we can feed it to our convolutional neural net.
          testBatch.xs.reshape([this.testBatchSize, 28, 28, 1]), testBatch.labels
        ];
      }

      //   return [batch, validationData];
      // });

      // The entire dataset doesn't fit into memory so we call train repeatedly
      // with batches using the fit() method.
      const history = await this.model.fit(
        batch.xs.reshape([this.batchSize, 28, 28, 1]), batch.labels,
        { batchSize: this.batchSize, validationData, epochs: this.epochs });

      const loss = history.history.loss[0];
      const accuracy = history.history.acc[0];

      let weights = this.playgroundService.extractWeights(this.model);

      // Plot loss / accuracy.
      lossValues.push({ 'batch': i, 'loss': loss, 'set': 'train' });
      // ui.plotLosses(lossValues);      

      if (validationData != null) {
        accuracyValues.push({ 'batch': i, 'accuracy': accuracy, 'set': 'train' });
        // ui.plotAccuracies(accuracyValues);
      }

      // Call dispose on the training/test tensors to free their GPU memory.
      tf.dispose([batch, validationData]);

      this.modelWeightsEveryBatch.push(weights);

      // tf.nextFrame() returns a promise that resolves at the next call to
      // requestAnimationFrame(). By awaiting this promise we keep our model
      // training from blocking the main UI thread and freezing the browser.
      await tf.nextFrame();
    }

    this.SetStatus("Training done!");

    console.log("===Loss===");
    console.log(lossValues);
    console.log("===Accuracies===");
    console.log(accuracyValues);
    console.log("===Weights===");
    console.log(this.modelWeightsEveryBatch);
  }

  plotData(container, trainingData) {
    let xvals = trainingData.xs.dataSync();
    let yvals = trainingData.ys.dataSync();
    let values = Array.from(yvals).map((y, i) => { return { 'x': xvals[i], 'y': yvals[i] }; });

    let ctx = container.nativeElement.getContext('2d');

    new Chart(ctx, {
      type: "scatter",
      data: {
        datasets: [{
          type: 'scatter',
          label: 'Generated Data',
          backgroundColor: "#3F51B5",
          data: values
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          xAxes: [{
            type: 'linear',
            position: 'bottom'
          }]
        }
      }
    });
  }

  plotDataAndPredictions(container, trainingData, prediction, beforeTraining: boolean) {
    let xvals = trainingData.xs.dataSync();
    let yvals = trainingData.ys.dataSync();
    let predVals = prediction.dataSync();

    let values = Array.from(yvals).map((y, i) => { return { 'x': xvals[i], 'y': yvals[i], pred: predVals[i] }; });
    let predValues = Array.from(yvals).map((y, i) => { return { 'x': xvals[i], 'y': predVals[i] }; });

    let ctx = container.nativeElement.getContext('2d');
    if (beforeTraining) {
      this.beforeChart = new Chart(ctx, {
        type: "scatter",
        data: {
          datasets: [{
            type: 'scatter',
            label: 'Generated Data',
            backgroundColor: "#3F51B5",
            data: values
          },
          {
            type: "line",
            label: "Prediction",
            data: predValues,
            showLine: false,
            fill: false,
            backgroundColor: "#E91E63"
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            xAxes: [{
              type: 'linear',
              position: 'bottom'
            }]
          }
        }
      });
    }
    else {
      this.predictionChart = new Chart(ctx, {
        type: "scatter",
        data: {
          datasets: [{
            type: 'scatter',
            label: 'Generated Data',
            backgroundColor: "#3F51B5",
            data: values
          },
          {
            type: "line",
            label: "Prediction",
            data: predValues,
            showLine: false,
            fill: false,
            backgroundColor: "#E91E63"
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            xAxes: [{
              type: 'linear',
              position: 'bottom'
            }]
          }
        }
      });
    }
  }

  updatePrediction(trainingData, prediction, chart) {
    let xvals = trainingData.xs.dataSync();
    let yvals = trainingData.ys.dataSync();
    let predVals = prediction.dataSync();

    let predValues = Array.from(yvals).map((y, i) => { return { 'x': xvals[i], 'y': predVals[i] }; });

    chart.data.datasets[1].data = predValues;
    chart.update();
  }

  reset() {
    if (this.playgroundForm.get('problem').value == "polynomial-regression") {
      if (this.predictionChart) { this.predictionChart.destroy(); }
      this.beforeTraining(true);
    }
  }

  // async problemChange(val: string) {
  //   this.playgroundForm.get('problem').value = val;
  //   this.changeDetector.detectChanges();

  //   if (val == "polynomial-regression") {
  //     this.generateData();
  //     this.beforeTraining(false);
  //   }
  //   else if (val == "mnist") {
  //     this.trainNetworkDisabled = true;
  //     this.changeDetector.detectChanges();

  //     await this.playgroundService.loadMnist();
  //     this.SetStatus("Data loaded!");

  //     this.trainNetworkDisabled = false;
  //     this.changeDetector.detectChanges();

  //     this.modelWeightsEveryBatch = [];
  //   }
  // }

  setupModel() {
    this.model = tf.sequential();
    this.model.add(tf.layers.conv2d({
      inputShape: [28, 28, 1],
      kernelSize: 5,
      filters: 8,
      strides: 1,
      activation: 'relu',
      kernelInitializer: 'varianceScaling'
    }));
    this.model.add(tf.layers.maxPooling2d({ poolSize: [2, 2], strides: [2, 2] }));
    this.model.add(tf.layers.conv2d({
      kernelSize: 5,
      filters: 16,
      strides: 1,
      activation: 'relu',
      kernelInitializer: 'varianceScaling'
    }));
    this.model.add(tf.layers.maxPooling2d({ poolSize: [2, 2], strides: [2, 2] }));
    this.model.add(tf.layers.flatten());
    this.model.add(tf.layers.dense(
      { units: 10, kernelInitializer: 'varianceScaling', activation: 'softmax' }));

    // this.learningRate = 0.15;
    // this.optimizer = tf.train.sgd(this.learningRate);
    this.optimizer = tf.train.sgd(0.15);
    this.model.compile({
      optimizer: this.optimizer,
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy'],
    });
  }

  SetStatus(msg: string) {
    this.divStatusRef.nativeElement.innerText = msg;
  }

  openSetupModelDialog() {
    console.log("will open dialog for model setup");
  }
  // ==================================================
}
