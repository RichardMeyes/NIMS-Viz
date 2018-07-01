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

    this.trainNetworkDisabled = true;

    this.playgroundService.loadMnist().then(() => {
      this.SetStatus("Data loaded!");
      this.trainNetworkDisabled = false;
    });
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
      batchSize: [0, Validators.required],
      numBatches: [0, Validators.required],
      epoch: [0, Validators.required],

      learningRate: ["", Validators.required],
      layerCount: [0, Validators.required],

      layers: this.fb.array([])
    });


    this.playgroundForm.patchValue({
      batchSize: this.playgroundData.batchSize,
      numBatches: this.playgroundData.numBatches,
      epoch: this.playgroundData.epoch,

      learningRate: this.playgroundData.learningRates[0].value,
      layerCount: this.playgroundData.layerCount
    });

    this.playgroundForm.setControl('layers', this.fb.array(
      this.playgroundService.arrayOne(this.playgroundData.layerCount).map(layer => this.fb.group({
        unitCount: [0, Validators.required]
      }))
    ));

    this.resetForm();
    this.layerCountChange();
  }

  // mnist 
  data;
  @ViewChild('divStatus') private divStatusRef;
  @ViewChild('trainNetwork') private trainNetworkRef;
  trainNetworkDisabled = false;

  trainNetwork() {
    console.log(this.playgroundForm.value);
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

  reset() {
    this.playgroundForm.patchValue({
      batchSize: this.playgroundData.batchSize,
      numBatches: this.playgroundData.numBatches,
      epoch: this.playgroundData.epoch,
      layerCount: this.playgroundData.layerCount
    });

    this.resetForm();
  }

  resetForm() {
    for (let i = 0; i < this.playgroundData.layerCount; i++) {
      let currLayer = this.playgroundData.mnistLayers[i];

      this.layers.controls[i].setValue({
        unitCount: currLayer.unitCount
      });
    }
  }

  layerCountChange() {
    const layerCountControl = this.playgroundForm.get('layerCount');
    layerCountControl.valueChanges.pipe(debounceTime(500)).forEach(
      () => {
        if (+this.playgroundForm.get('layerCount').value > this.layers.controls.length) {
          for (let i = this.layers.controls.length; i < +this.playgroundForm.get('layerCount').value; i++) {
            this.layers.push(this.fb.group({
              unitCount: [0, Validators.required]
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

  SetStatus(msg: string) {
    this.divStatusRef.nativeElement.innerText = msg;
  }
  // ==================================================
}
