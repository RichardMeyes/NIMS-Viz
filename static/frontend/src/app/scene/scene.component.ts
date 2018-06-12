import { Component, OnInit, ViewChild, AfterViewInit, HostListener, Renderer2, Input } from '@angular/core';
import { NetworkService } from '../network.service';

import * as THREE from 'three';
import * as Stats from 'stats.js/build/stats.min.js';
import * as simpleheat from 'simpleheat/simpleheat.js';
import * as tf from '@tensorflow/tfjs';
// import renderChart from 'vega-embed';

import '../../customs/enable-three-examples.js';
import 'three/examples/js/loaders/OBJLoader.js';
import 'three/examples/js/controls/OrbitControls';

import { BrainComponent } from './brain/brain.component';
import { PlaygroundService } from '../playground.service';
import { generate } from 'rxjs';


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

  constructor(private networkService: NetworkService, private renderer2: Renderer2, private playgroundService: PlaygroundService) {
    // this.networkService.loadFromJson().subscribe(
    //   (weights) => {
    //     this.weights = weights;
    //     console.log(this.weights);
    //     this.networkService.createNetworkFromWeights(this.weights);
    //   }
    // );
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
    this.beforeTraining();
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
  trueCoefficients; trainingData;
  randomCoefficients;
  a; b; c; d;

  numIterations = 75;
  learningRate = 0.5;
  optimizer = tf.train.sgd(this.learningRate);

  layerCount = 1;
  nodeCount = 1;

  @ViewChild('dataCoeff') private dataCoeffRef;
  @ViewChild('randomCoeff') private randomCoeffRef;
  @ViewChild('trainedCoeff') private trainedCoeddRef;

  renderCoefficients(container, coeff) {
    container.nativeElement.innerHTML =
      `<span>a=${coeff.a.toFixed(3)}, b=${coeff.b.toFixed(3)}, c=${
      coeff.c.toFixed(3)},  d=${coeff.d.toFixed(3)}</span>`;
  }

  // plotData(container, xs, ys) {
  //   let xvals = xs.dataSync();
  //   let yvals = ys.dataSync();

  //   let values = Array.from(yvals).map((y, i) => {
  //     return { 'x': xvals[i], 'y': yvals[i] };
  //   });

  //   let spec: any = {
  //     '$schema': 'https://vega.github.io/schema/vega-lite/v2.json',
  //     'width': 300,
  //     'height': 300,
  //     'data': { 'values': values },
  //     'mark': 'point',
  //     'encoding': {
  //       'x': { 'field': 'x', 'type': 'quantitative' },
  //       'y': { 'field': 'y', 'type': 'quantitative' }
  //     }
  //   };

  //   return renderChart(container, spec, { actions: false });
  // }

  // plotDataAndPredictions(container, xs, ys, preds) {
  //   const xvals = xs.dataSync();
  //   const yvals = ys.dataSync();
  //   const predVals = preds.dataSync();

  //   const values = Array.from(yvals).map((y, i) => {
  //     return { 'x': xvals[i], 'y': yvals[i], pred: predVals[i] };
  //   });

  //   const spec: any = {
  //     '$schema': 'https://vega.github.io/schema/vega-lite/v2.json',
  //     'width': 300,
  //     'height': 300,
  //     'data': { 'values': values },
  //     'layer': [
  //       {
  //         'mark': 'point',
  //         'encoding': {
  //           'x': { 'field': 'x', 'type': 'quantitative' },
  //           'y': { 'field': 'y', 'type': 'quantitative' }
  //         }
  //       },
  //       {
  //         'mark': 'line',
  //         'encoding': {
  //           'x': { 'field': 'x', 'type': 'quantitative' },
  //           'y': { 'field': 'pred', 'type': 'quantitative' },
  //           'color': { 'value': 'tomato' }
  //         },
  //       }
  //     ]
  //   };

  //   return renderChart(container, spec, { actions: false });
  // }

  generateData() {
    this.trueCoefficients = { a: -.8, b: -.2, c: .9, d: .5 };
    this.trainingData = this.playgroundService.generateData(100, this.trueCoefficients);
    this.renderCoefficients(this.dataCoeffRef, this.trueCoefficients);
    // this.plotData('#data .plot', this.trainingData.xs, this.trainingData.ys);
  }

  beforeTraining() {
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
    // this.plotDataAndPredictions('#random .plot', this.trainingData.xs, this.trainingData.ys, predictionsBefore);
  }
  // ==================================================
}
