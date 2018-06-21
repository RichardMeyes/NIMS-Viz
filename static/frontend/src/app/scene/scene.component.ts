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

// import { BrainComponent } from './brain/brain.component';
import { PlaygroundService } from '../playground.service';
import { generate } from 'rxjs';
import { update } from '@tensorflow/tfjs-layers/dist/variables';
import { Playground, TfjsLayer } from '../playground.model';
import { FormGroup, FormBuilder, Validators, FormArray } from '@angular/forms';
import { debounceTime } from 'rxjs/operators';


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
  private scenes: THREE.Scene[] = [];
  private camera: THREE.PerspectiveCamera;
  private renderer: any;
  private controls: THREE.OrbitControls;

  private cube: THREE.Mesh;

  private windowWidth: number;
  private windowHeight: number;
  private fieldOfView = 45;
  private nearClippingPane = 1;
  private farClippingPane = 2000;

  private weights: any;


  private redraw = true;
  private fpsHack = 0;
  private showBrainView = false;
  private heat;
  private heatmapData = [];
  private heatmapCanvasTexture;

  private heatmapConfig = {
    radius: 4,
    blur: 2,
    minOpacity: 0.05,
    color1: '#0000ff',
    color1Trigger: 0.4,
    color2: '#00ff00',
    color2Trigger: 0.65,
    color3: '#ff0000',
    color3Trigger: 1.0,
    colorGradient: function () {
      const tempobj = {};
      tempobj[0.0] = 'blue';
      tempobj[this.color1Trigger] = this.color1;
      tempobj[this.color2Trigger] = this.color2;
      tempobj[this.color3Trigger] = this.color3;
      return tempobj;
    }
  };

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

    try {
      this.camera.aspect = this.windowWidth / this.windowHeight;
      this.camera.updateProjectionMatrix();

      this.renderer.setSize(this.windowWidth, this.windowHeight);
    } catch (error) {
      console.log(error);
    }
  }

  constructor(
    private networkService: NetworkService,
    private renderer2: Renderer2,
    private playgroundService: PlaygroundService,
    private changeDetector: ChangeDetectorRef,
    private fb: FormBuilder) {
    // this.networkService.loadFromJson().subscribe(
    //   (weights) => {
    //     this.weights = weights;
    //     console.log(this.weights);
    //     this.networkService.createNetworkFromWeights(this.weights);
    //     this.setup();
    //   }
    // );    
    this.createForm();
  }

  ngOnInit() {
    this.selectedFile = this.files[0].value;
    console.log('ngOnInit');
    // this.setupScene();
  }

  private startCalc() {
    console.log('quick test', this.selectedFile);

  }

  private testFunction() {
    this.brainComponent.createConnectionsBetweenLayers(this.weights,
      this.networkService.getLayerObj,
      this.networkService.getNetworkReductionFactor);
  }

  private testingToggler(e) {
    this.showBrainView = !e['checked'];
    console.log('this.showBrainView', this.showBrainView);
    this.setup();
  }

  public toggle() {
    this.snav.toggle();
  }

  ngAfterViewInit() {
    this.generateData();
    this.beforeTraining(false);
  }

  private setup() {
    this.setupScene();
    this.setupCamera();
    this.setupRenderer();
    this.setupUtilities();
  }

  private setupScene() {
    // this.scene = new THREE.Scene();

    if (this.showBrainView) {
      // draw heatmap
      this.heat = simpleheat(document.getElementById('canvHeatmap'));
      this.scene = this.brainComponent.setupBrain();
    } else {
      this.scene = this.moleculeComponent.setupMolecule(this.networkService.getMoleculeStruct);
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
    if (this.showBrainView) {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true
      });
    } else {
      this.renderer = new THREE.CSS3DRenderer();
    }
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    console.log('renderer', this.renderer);
    document.body.appendChild(this.renderer.domElement);
    // this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);

    /*const component: SceneComponent = this;
    (function render() {
      requestAnimationFrame(render);
      component.renderer.render(component.scene, component.camera);
    }());*/

    const render = () => {
      requestAnimationFrame(render);
      if (this.redraw && this.showBrainView) {
        // last layer has no connections to "next" layer
        // if (stepperCnt < convertedLayerObjs.length - 1) {
        this.heat.clear();
        // set radius and blur radius
        this.heat.radius(this.heatmapConfig.radius, this.heatmapConfig.blur);
        this.heat.gradient(this.heatmapConfig.colorGradient());
        this.heat.data(this.heatmapData);
        // this.heat.draw(this.heatmapConfig.minOpacity); // leads to extreme memory leak!
        this.heat.draw();
        this.heatmapCanvasTexture.needsUpdate = true;
        // }
        this.redraw = false;
      } else if (this.redraw && !this.showBrainView) {
        // render molecule
      } else if (this.fpsHack >= 60) {
        this.fpsHack = 0;
        this.redraw = true;
      }
      this.fpsHack++;
      this.renderer.render(this.scene, this.camera);
      // this.renderer.dispose();
    };
    render();
    console.log('render called');
  }

  private setupUtilities() {
    // ==================================================
    // controls
    // ==================================================
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.rotateSpeed = 1.0;
    this.controls.zoomSpeed = 1.2;
  }

  public updateHeatmapData(updatedHeatmapData) {
    this.heatmapData = updatedHeatmapData;
  }

  public updateHeatmapCanvasTexture(updatedHeatmapCanvasTexture) {
    this.heatmapCanvasTexture = updatedHeatmapCanvasTexture;
  }

  private getAspectRatio(): number {
    return window.innerWidth / window.innerHeight;
  }


  // ==================================================
  // playground
  // ==================================================
  playgroundForm: FormGroup;
  playgroundData: Playground = new Playground();

  get layers(): FormArray {
    return this.playgroundForm.get('layers') as FormArray;
  };

  createForm() {
    this.playgroundForm = this.fb.group({
      problem: ["", Validators.required],
      learningRate: ["", Validators.required],

      numOfIteration: [0, Validators.required],
      optimizer: ["", Validators.required],

      layerCount: [0, Validators.required],
      layers: this.fb.array([]),
      mnistLoss: ["", Validators.required],

      batchSize: [0, Validators.required],
      trainBatches: [0, Validators.required],
      testBatchSize: [0, Validators.required]
    });


    this.playgroundForm.patchValue({
      problem: this.playgroundData.problems[0].value,
      learningRate: this.playgroundData.learningRates[0].value,

      numOfIteration: this.playgroundData.numOfIteration,
      optimizer: this.playgroundData.optimizers[0].value,

      layerCount: this.playgroundData.layerCount,
      mnistLoss: this.playgroundData.mnistLoss,

      batchSize: this.playgroundData.batchSize,
      trainBatches: this.playgroundData.trainBatches,
      testBatchSize: this.playgroundData.testBatchSize
    });

    this.playgroundForm.setControl('layers', this.fb.array(
      this.playgroundService.arrayOne(this.playgroundData.layerCount).map(layer => this.fb.group({
        layerType: "",
        isInput: false,
        inputShape: [],
        kernelSize: 0,
        filters: 0,
        strides: 0,
        poolSize: 0,
        units: 0,
        activation: "",
        kernelInitializer: "",
        rate: 0
      }))
    ));

    this.resetForm();
    this.layerCountChange();
  }


  optimizer;
  model;

  trueCoefficients; trainingData;
  randomCoefficients;
  trainingPredictions;
  a; b; c; d;




  nodeCount = 1;

  beforeChart; predictionChart;


  @ViewChild('dataCoeff') private dataCoeffRef;
  @ViewChild('randomCoeff') private randomCoeffRef;
  @ViewChild('trainedCoeff') private trainedCoeffRef;

  @ViewChild('dataCanvas') private dataCanvasRef;
  @ViewChild('randomCanvas') private randomCanvasRef;
  @ViewChild('trainedCanvas') private trainedCanvasRef;


  // mnist 

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

  // public findInvalidControls() {
  //   const invalid = [];
  //   const controls = this.playgroundForm.controls;
  //   for (const name in controls) {
  //     if (controls[name].invalid) {
  //       invalid.push(name);
  //     }
  //   }

  //   for (const name in this.layers.controls) {
  //     for (const name2 in this.layers.controls[name].controls) {
  //       if (this.layers.controls[name].controls[name2].invalid) {
  //         invalid.push(name2);
  //       }
  //     }
  //   }

  //   return invalid;
  // }

  async trainModel() {
    this.SetStatus("Training...");

    // We'll keep a buffer of loss and accuracy values over time.
    const lossValues = [];
    const accuracyValues = [];
    this.modelWeightsEveryBatch = [];

    // Iteratively train our model on mini-batches of data.
    // for (let i = 0; i < this.playgroundForm.get('trainBatches').value; i++) {
    for (let i = 0; i < 2; i++) {
      // const [batch, validationData] = tf.tidy(() => {
      const batch = this.playgroundService.nextTrainBatch(this.playgroundForm.get('batchSize').value);
      // batch.xs = batch.xs.reshape<any>([this.batchSize, 28, 28, 1]);

      let validationData;
      // Every few batches test the accuracy of the model.
      if (i % this.testIterationFrequency === 0) {
        const testBatch = this.playgroundService.nextTestBatch(this.playgroundForm.get('testBatchSize').value);
        validationData = [
          // Reshape the training data from [64, 28x28] to [64, 28, 28, 1] so
          // that we can feed it to our convolutional neural net.
          testBatch.xs.reshape([this.playgroundForm.get('testBatchSize').value, 784]), testBatch.labels
        ];
      }

      //   return [batch, validationData];
      // });

      // The entire dataset doesn't fit into memory so we call train repeatedly
      // with batches using the fit() method.
      const history = await this.model.fit(
        batch.xs.reshape([this.playgroundForm.get('batchSize').value, 784]), batch.labels,
        { batchSize: this.playgroundForm.get('batchSize').value, validationData, epochs: this.epochs });

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
    this.playgroundForm.patchValue({
      learningRate: this.playgroundData.learningRates[0].value,
      optimizer: this.playgroundData.optimizers[0].value,

      layerCount: this.playgroundData.layerCount,
      mnistLoss: this.playgroundData.mnistLoss,

      batchSize: this.playgroundData.batchSize,
      trainBatches: this.playgroundData.trainBatches,
      testBatchSize: this.playgroundData.testBatchSize
    });

    if (this.playgroundForm.get('problem').value == "polynomial-regression") {
      if (this.predictionChart) { this.predictionChart.destroy(); }
      this.beforeTraining(true);
    }
    else if (this.playgroundForm.get('problem').value == "mnist") {
      this.resetForm();
    }
  }

  problemChange() {
    this.changeDetector.detectChanges();

    if (this.playgroundForm.get('problem').value == "polynomial-regression") {
      this.generateData();
      this.beforeTraining(false);
    }
    else if (this.playgroundForm.get('problem').value == "mnist") {
      this.trainNetworkDisabled = true;

      this.playgroundService.loadMnist().then(() => {
        this.SetStatus("Data loaded!");
        this.trainNetworkDisabled = false;

        this.modelWeightsEveryBatch = [];
      });
    }
  }

  setupModel() {
    this.model = tf.sequential();
    for (let i = 0; i < +this.playgroundForm.get('layerCount').value; i++) {
      let options = <any>this.extractOptions(i);
      switch (this.layers.controls[i].get('layerType').value) {
        case "conv2d": {
          this.model.add(tf.layers.conv2d(options));
          break;
        }
        case "maxPooling2d": {
          this.model.add(tf.layers.maxPooling2d(options));
          break;
        }
        case "flatten": {
          this.model.add(tf.layers.flatten(options));
          break;
        }
        case "dense": {
          this.model.add(tf.layers.dense(options));
          break;
        }
        case "dropout": {
          this.model.add(tf.layers.dropout(options));
          break;
        }
      }
    }

    this.model.compile({
      optimizer: this.optimizer,
      loss: this.playgroundForm.get('mnistLoss').value,
      metrics: ['accuracy'],
    });
  }

  extractOptions(i: number) {
    let options: { [key: string]: any } = {};

    if (this.layers.controls[i].get('isInput').value) {
      options.inputShape = <string>this.layers.controls[i].get('inputShape').value.split(",").map(val => +val);
      if (options.inputShape.length == 1) options.inputShape = options.inputShape[0];
    }

    switch (this.layers.controls[i].get('layerType').value) {
      case "conv2d": {
        options.kernelSize = <string>this.layers.controls[i].get('kernelSize').value.split(",").map(val => +val);
        options.filters = <string>this.layers.controls[i].get('filters').value.split(",").map(val => +val);
        options.strides = <string>this.layers.controls[i].get('strides').value.split(",").map(val => +val);
        options.activation = this.layers.controls[i].get('activation').value;
        options.kernelInitializer = this.layers.controls[i].get('kernelInitializer').value;

        if (options.kernelSize.length == 1) options.kernelSize = options.kernelSize[0];
        if (options.filters.length == 1) options.filters = options.filters[0];
        if (options.strides.length == 1) options.strides = options.strides[0];
      }
      case "maxPooling2d": {
        options.poolSize = <string>this.layers.controls[i].get('poolSize').value.split(",").map(val => +val);
        options.strides = <string>this.layers.controls[i].get('strides').value.split(",").map(val => +val);

        if (options.poolSize.length == 1) options.poolSize = options.poolSize[0];
        if (options.strides.length == 1) options.strides = options.strides[0];
        break;
      }
      case "flatten": {
        break;
      }
      case "dense": {
        options.units = <string>this.layers.controls[i].get('units').value.split(",").map(val => +val);;
        options.activation = this.layers.controls[i].get('activation').value;
        options.kernelInitializer = this.layers.controls[i].get('kernelInitializer').value;

        if (options.units.length == 1) options.units = options.units[0];
        break;
      }
      case "dropout": {
        options.rate = +this.layers.controls[i].get('rate').value;
        break;
      }
    }
    return options;
  }

  isConfigAvailable(i: number, configProperty: string): boolean {
    for (let index = 0; index < this.playgroundData.layers.length; index++) {
      for (let index2 = 0; index2 < this.playgroundData.layers[index].layerItem.length; index2++) {
        if (this.layers.controls[i].get('layerType').value == this.playgroundData.layers[index].layerItem[index2].layerType.value) {
          return this.playgroundData.layers[index].layerItem[index2].layerItemConfiguration[configProperty] || false;
        }
      }
    }
    return false;
  }

  resetForm() {
    for (let i = 0; i < this.playgroundData.layerCount; i++) {
      let currLayer = this.playgroundData.mnistLayers[i].layerItem[0];

      this.layers.controls[i].setValue({
        layerType: currLayer.layerType.value,
        isInput: currLayer.isInput,
        inputShape: currLayer.layerItemConfiguration.inputShape || "",
        kernelSize: currLayer.layerItemConfiguration.kernelSize || "",
        filters: currLayer.layerItemConfiguration.filters || "",
        strides: currLayer.layerItemConfiguration.strides || "",
        poolSize: currLayer.layerItemConfiguration.poolSize || "",
        units: currLayer.layerItemConfiguration.units || "",
        activation: currLayer.layerItemConfiguration.activation || "",
        kernelInitializer: currLayer.layerItemConfiguration.kernelInitializer || "",
        rate: currLayer.layerItemConfiguration.rate || ""
      });

      this.removeValidators(i);
      this.setValidators(i);
    }
  }

  layerCountChange() {
    const layerCountControl = this.playgroundForm.get('layerCount');
    layerCountControl.valueChanges.pipe(debounceTime(500)).forEach(
      () => {
        if (+this.playgroundForm.get('layerCount').value > this.layers.controls.length) {
          for (let i = this.layers.controls.length; i < +this.playgroundForm.get('layerCount').value; i++) {
            this.layers.push(this.fb.group({
              layerType: ["", Validators.required],
              isInput: false,
              inputShape: [],
              kernelSize: 0,
              filters: 0,
              strides: 0,
              poolSize: 0,
              units: 0,
              activation: "",
              kernelInitializer: "",
              rate: 0
            }));
          }
        }
        else {
          for (let i = this.layers.controls.length; i > +this.playgroundForm.get('layerCount').value; i--) {
            this.layers.removeAt(i - 1);
          }
        }
      }
    );
  }

  setValidators(i: number) {
    if (this.isConfigAvailable(i, "layerType")) {
      this.layers.controls[i].get("layerType").setValidators(Validators.required);
      this.layers.controls[i].get("layerType").updateValueAndValidity();
    }
    if (this.isConfigAvailable(i, "isInput")) {
      this.layers.controls[i].get("isInput").setValidators(Validators.required);
      this.layers.controls[i].get("isInput").updateValueAndValidity();
    }
    if (this.isConfigAvailable(i, "inputShape")) {
      this.layers.controls[i].get("inputShape").setValidators(Validators.required);
      this.layers.controls[i].get("inputShape").updateValueAndValidity();
    }
    if (this.isConfigAvailable(i, "kernelSize")) {
      this.layers.controls[i].get("kernelSize").setValidators(Validators.required);
      this.layers.controls[i].get("kernelSize").updateValueAndValidity();
    }
    if (this.isConfigAvailable(i, "filters")) {
      this.layers.controls[i].get("filters").setValidators(Validators.required);
      this.layers.controls[i].get("filters").updateValueAndValidity();
    }
    if (this.isConfigAvailable(i, "strides")) {
      this.layers.controls[i].get("strides").setValidators(Validators.required);
      this.layers.controls[i].get("strides").updateValueAndValidity();
    }
    if (this.isConfigAvailable(i, "poolSize")) {
      this.layers.controls[i].get("poolSize").setValidators(Validators.required);
      this.layers.controls[i].get("poolSize").updateValueAndValidity();
    }
    if (this.isConfigAvailable(i, "units")) {
      this.layers.controls[i].get("units").setValidators(Validators.required);
      this.layers.controls[i].get("units").updateValueAndValidity();
    }
    if (this.isConfigAvailable(i, "activation")) {
      this.layers.controls[i].get("activation").setValidators(Validators.required);
      this.layers.controls[i].get("activation").updateValueAndValidity();
    }
    if (this.isConfigAvailable(i, "kernelInitializer")) {
      this.layers.controls[i].get("kernelInitializer").setValidators(Validators.required);
      this.layers.controls[i].get("kernelInitializer").updateValueAndValidity();
    }
    if (this.isConfigAvailable(i, "rate")) {
      this.layers.controls[i].get("rate").setValidators(Validators.required);
      this.layers.controls[i].get("rate").updateValueAndValidity();
    }
  }

  removeValidators(i: number) {
    // if (this.layers.controls[i].get("layerType")) {
    //   this.layers.controls[i].get("layerType").clearValidators();
    //   this.layers.controls[i].get("layerType").updateValueAndValidity();
    // }
    if (this.layers.controls[i].get("isInput")) {
      this.layers.controls[i].get("isInput").clearValidators();
      this.layers.controls[i].get("isInput").updateValueAndValidity();
    }
    if (this.layers.controls[i].get("inputShape")) {
      this.layers.controls[i].get("inputShape").clearValidators();
      this.layers.controls[i].get("inputShape").updateValueAndValidity();
    }
    if (this.layers.controls[i].get("kernelSize")) {
      this.layers.controls[i].get("kernelSize").clearValidators();
      this.layers.controls[i].get("kernelSize").updateValueAndValidity();
    }
    if (this.layers.controls[i].get("filters")) {
      this.layers.controls[i].get("filters").clearValidators();
      this.layers.controls[i].get("filters").updateValueAndValidity();
    }
    if (this.layers.controls[i].get("strides")) {
      this.layers.controls[i].get("strides").clearValidators();
      this.layers.controls[i].get("strides").updateValueAndValidity();
    }
    if (this.layers.controls[i].get("poolSize")) {
      this.layers.controls[i].get("poolSize").clearValidators();
      this.layers.controls[i].get("poolSize").updateValueAndValidity();
    }
    if (this.layers.controls[i].get("units")) {
      this.layers.controls[i].get("units").clearValidators();
      this.layers.controls[i].get("units").updateValueAndValidity();
    }
    if (this.layers.controls[i].get("activation")) {
      this.layers.controls[i].get("activation").clearValidators();
      this.layers.controls[i].get("activation").updateValueAndValidity();
    }
    if (this.layers.controls[i].get("kernelInitializer")) {
      this.layers.controls[i].get("kernelInitializer").clearValidators();
      this.layers.controls[i].get("kernelInitializer").updateValueAndValidity();
    }
    if (this.layers.controls[i].get("rate")) {
      this.layers.controls[i].get("rate").clearValidators();
      this.layers.controls[i].get("rate").updateValueAndValidity();
    }

  }

  layerTypeChange(i: number) {
    this.removeValidators(i);
    this.setValidators(i);
  }

  SetStatus(msg: string) {
    this.divStatusRef.nativeElement.innerText = msg;
  }
  // ==================================================
}
