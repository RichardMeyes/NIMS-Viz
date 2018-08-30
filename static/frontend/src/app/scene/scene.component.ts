import {
  Component, OnInit, ViewChild, AfterViewInit, HostListener, Renderer2, Input, AfterViewChecked, ChangeDetectorRef, OnDestroy
} from '@angular/core';
import { NetworkService } from '../network.service';

import * as THREE from 'three';
import * as Stats from 'stats.js/build/stats.min.js';
import * as simpleheat from 'simpleheat/simpleheat.js';
import * as tf from '@tensorflow/tfjs';
import { Chart } from 'chart.js';

import '../../customs/enable-three-examples.js';
import 'three/examples/js/renderers/CSS3DRenderer.js';
import 'three/examples/js/controls/OrbitControls';

// import { BrainComponent } from './brain/brain.component';
import { PlaygroundService } from '../playground.service';
import { generate, Subscription } from 'rxjs';
import { update } from '@tensorflow/tfjs-layers/dist/variables';
import { Playground, TfjsLayer } from '../playground.model';
import { FormGroup, FormBuilder, Validators, FormArray } from '@angular/forms';
import { debounceTime } from 'rxjs/operators';
// import { MqttService, IMqttMessage } from 'ngx-mqtt';


@Component({
  selector: 'app-scene',
  templateUrl: './scene.component.html',
  styleUrls: ['./scene.component.scss']
})
export class SceneComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('brainComponent') brainComponent;
  // @ViewChild('moleculeComponent') moleculeComponent;
  @Input() fixedTopGap: boolean;
  private scene: THREE.Scene;
  private scenes: THREE.Scene[] = [];
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
  public showBrainView = true;
  private heatmapNormal;
  private heatmapNodes;
  private heatmapNormalData = [];
  private heatmapNodeData = [];
  private heatmapCanvasNormalTexture;
  private heatmapCanvasNodeTexture;
  private drawFully = false;
  private isAnimateOn = false;
  private isPlaying = false;

  private heatmapNormalConfig = {
    radius: 2,
    blur: 8,
    density: 5,
    minOpacity: 0.05,
    weightValueMin: -10,
    weightValueMax: 10,
    color1: '#0000ff',
    color1Trigger: 0.0,
    color2: '#ffffff',
    color2Trigger: 0.5,
    color3: '#ff0000',
    color3Trigger: 1.0,
    colorGradient: function () {
      const tempobj = {};
      // convert triggervalues into percentages to be >= 0
      const diff = Math.abs(this.weightValueMax - this.weightValueMin);
      const col1TriggerInPerc = parseFloat((Math.abs(this.color1Trigger - this.weightValueMin) / diff).toFixed(2));
      const col2TriggerInPerc = parseFloat((Math.abs(this.color2Trigger - this.weightValueMin) / diff).toFixed(2));
      const col3TriggerInPerc = parseFloat((Math.abs(this.color3Trigger - this.weightValueMin) / diff).toFixed(2));
      tempobj[col1TriggerInPerc] = this.color1;
      tempobj[col2TriggerInPerc] = this.color2;
      tempobj[col3TriggerInPerc] = this.color3;
      return tempobj;
    }
  };

  private heatmapNodeConfig = {
    radius: 1,
    blur: 0,
    minOpacity: 0.5,
    color1: '#ff0000',
    color1Trigger: 0.1,
    // color2: '#00ff00',
    // color2Trigger: 0.02,
    // color3: '#ff0000',
    // color3Trigger: 0.3,
    colorGradient: function () {
      const tempobj = {};
      // const diff = Math.abs(this.weightValueMax - this.weightValueMin);
      // const col3TriggerInPerc = parseFloat((Math.abs(this.color3Trigger - this.weightValueMin) / diff).toFixed(2));
      // tempobj[0.0] = 'blue';
      tempobj[this.color1Trigger] = this.color1;
      // tempobj[this.color2Trigger] = this.color2;
      // tempobj[col3TriggerInPerc] = this.color3;
      return tempobj;
    }
  };

  // private get getCanvas(): HTMLCanvasElement {
  //   return this.canvasRef.nativeElement;
  // }

  files = [
    { value: 'model1.h5', viewValue: 'File 1', epochRange: [0, 1], weightMinMax: [0, 1] },
    { value: 'model2.h5', viewValue: 'File 2', epochRange: [0, 1], weightMinMax: [0, 1] },
    { value: 'model3.h5', viewValue: 'File 3', epochRange: [0, 1], weightMinMax: [0, 1] }
  ];

  private selectedFile;

  layerCount = 15;
  nodeCount = 15;

  private epochRange = [0, 1];
  epochValue: number;
  private epochSelectedRange = [0, 1];

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

  heatCanvas: any;
  heatCanvasNodes: any;
  brainUVMapMesh: THREE.Mesh;

  views = [
    // top left brainobj
    {
      left: 0,
      top: 0,
      width: 0.5,
      height: 0.475,
      background: new THREE.Color(1, 1, 1),
      eye: [0, 0, 3],
      up: [0, 1, 0],
      fov: 30
      // updateCamera: function (camera, scene, mouseX, mouseY) {
      //   camera.position.x += mouseX * 0.05;
      //   camera.position.x = Math.max(Math.min(camera.position.x, 2000), -2000);
      //   camera.lookAt(scene.position);
      // }
    },
    // top right 2Dbraingreyscale
    {
      left: 0.5,
      top: 0,
      width: 0.5,
      height: 0.475,
      background: new THREE.Color(1, 1, 1),
      eye: [-0.25, 0.25, 51],
      up: [0, 0, 1],
      fov: 45
      // updateCamera: function ( camera, scene, mouseX, mouseY ) {
      // camera.position.x -= mouseX * 0.05;
      // camera.position.x = Math.max( Math.min( camera.position.x, 2000 ), -2000 );
      // camera.lookAt( camera.position.clone().setY( 0 ) );
      // }
    },
    // bottom left
    {
      left: 0,
      top: 0.475,
      width: 0.5,
      height: 0.475,
      background: new THREE.Color(1, 1, 1),
      eye: [3.75, 0.25, 51],
      up: [0, 1, 0],
      fov: 45
      // updateCamera: function (camera, scene, mouseX, mouseY) {
      //   camera.position.y -= mouseX * 0.05;
      //   camera.position.y = Math.max(Math.min(camera.position.y, 1600), -1600);
      //   camera.lookAt(scene.position);
      // }
    }
  ];
  isHeatmapChanged = true;

  color1: string;
  color2: string;
  color3: string;

  col1Trigger = 40;
  col2Trigger = 65;
  col3Trigger = 100;


  // Playground
  playgroundForm: FormGroup;
  playgroundData: Playground = new Playground();

  vizWeights: any;

  // Mqtt
  private subscription: Subscription;
  public message: string;
  animationEpochInterval;
  newFile = false;

  constructor(
    private networkService: NetworkService,
    private renderer2: Renderer2,
    private playgroundService: PlaygroundService,
    private changeDetector: ChangeDetectorRef,
    private fb: FormBuilder,
    // private _mqttService: MqttService
  ) {
    /*this.networkService.loadFromJson().subscribe(
      (weights) => {
        this.weights = weights;
        console.log('weights from json', this.weights);
        // TODO: this network function is no longer needed?
        // this.networkService.createNetworkFromWeights(this.weights);
        // this.setup();
      }
    );*/
    // this.subscription = this._mqttService.observe('my/topic').subscribe((message: IMqttMessage) => {
    //   this.message = message.payload.toString();
    // });
  }

  ngOnInit() {
    this.createForm();
    this.scanForFiles();
    this.selectedFileClick(this.files[0].value, true);
  }

  ngAfterViewInit() {
    this.setup();
  }

  @HostListener('window:resize', ['$event'])
  onResize(event) {
    // this.windowWidth = window.innerWidth;
    // this.windowHeight = window.innerHeight;

    try {
      for (const view of this.views) {
        view['camera'].aspect = this.windowWidth / this.windowHeight;
        view['camera'].updateProjectionMatrix();

        this.renderer.setSize(this.windowWidth, this.windowHeight - 67.125);
      }
    } catch (error) {
      console.log(error);
    }
  }

  private scanForFiles(isNewlyCreated?: boolean) {
    this.networkService.detectFiles().subscribe(
      data => {
        console.log('files found', data);
        const newFileList = [];
        for (const element of data['result']) {
          newFileList.push({
            value: element['pathName'],
            viewValue: element['fileName'],
            epochRange: element['epochMinMax'],
            weightMinMax: element['weightMinMax']
          });
        }
        if (isNewlyCreated) {
          let newFileValue = '';
          for (const currFile of newFileList) {
            const isFound = this.files.find(element => element.value === currFile.value);
            console.log(isFound);

            if (typeof (isFound) === 'undefined') {
              newFileValue = currFile.value;
              break;
            } else {
              newFileValue = this.selectedFile;
            }
          }
          this.files = newFileList;
          this.selectedFileClick(this.files.find(element => element.value === newFileValue).value);
        } else {
          this.files = newFileList;
          this.selectedFileClick(this.files[0].value);
        }
      }
    );
  }

  private selectedFileClick(filePath, isSetup?: boolean) {
    this.selectedFile = filePath;
    // change slider values
    this.epochRange = this.files.find(element => element.value === filePath).epochRange;
    this.epochValue = this.epochRange[1];
    this.heatmapNormalConfig.weightValueMin = this.files.find(element => element.value === this.selectedFile).weightMinMax[0];
    this.heatmapNormalConfig.weightValueMax = this.files.find(element => element.value === this.selectedFile).weightMinMax[1];
    this.newFile = true;
    if (!isSetup) {
      this.createHeatmap();
      this.newFile = false;
    }
  }

  public fuckingA($event) {
    console.log('fuckingA', event);
    console.log('fuckingB', $event);
  }

  // change in epochvalue triggeres onmodelchange and therefore new heatmapcreation
  public startEpochAnimation() {
    this.isPlaying = true;
    this.epochValue = this.epochSelectedRange[0];
    this.animationEpochInterval = setInterval(() => {
      if (this.epochValue < this.epochSelectedRange[1]) {
        this.epochValue++;
      } else {
        this.epochValue = this.epochSelectedRange[0];
      }
    }, 1000);
  }

  public stopEpochAnimation() {
    this.isPlaying = false;
    clearInterval(this.animationEpochInterval);
  }

  public createHeatmap() {
    this.networkService.createHeatmapFromFile(
      this.selectedFile,
      this.epochValue,
      [this.heatmapNormalConfig.weightValueMin, this.heatmapNormalConfig.weightValueMax],
      this.drawFully,
      this.newFile,
      this.heatmapNormalConfig.density
    ).subscribe(
      data => {
        this.heatmapNodeData = data['heatmapNodeData'];
        this.heatmapNormalData = data['heatmapNormalData'];

        // this.heatmapNormalConfig.weightValueMax = data['weightValueMax'];
        // this.heatmapNormalConfig.weightValueMin = data['weightValueMin'];
        this.heatmapNormalConfig.color1Trigger = parseFloat((this.heatmapNormalConfig.weightValueMin +
          (this.heatmapNormalConfig.weightValueMax - this.heatmapNormalConfig.weightValueMin) / 2.5).toFixed(4));
        this.heatmapNormalConfig.color2Trigger = parseFloat((this.heatmapNormalConfig.weightValueMax -
          (this.heatmapNormalConfig.weightValueMax - this.heatmapNormalConfig.weightValueMin) / 2.5).toFixed(4));
        this.heatmapNormalConfig.color3Trigger = this.heatmapNormalConfig.weightValueMax;
        this.heatmapNodeConfig.color1Trigger = this.heatmapNormalConfig.weightValueMax;
        this.applyingDataToHeatmaps();
      }
    );

    // this.networkService.asyncCalcHeatmap(this.weights).subscribe(
    //   data => {
    //     this.heatmapNodeData = data['heatmapNodeData'];
    //     this.heatmapNormalData = data['heatmapNormalData'];
    //     this.applyingDataToHeatmaps();
    //   }
    // );
  }

  private applyingDataToHeatmaps() {
    this.heatmapNormal.clear();
    this.heatmapNodes.clear();
    // set radius and blur radius
    this.heatmapNormal.radius(this.heatmapNormalConfig.radius, this.heatmapNormalConfig.blur);
    this.heatmapNormal.gradient(this.heatmapNormalConfig.colorGradient());
    this.heatmapNormal.data(this.heatmapNormalData);

    this.heatmapNodes.radius(this.heatmapNodeConfig.radius, this.heatmapNodeConfig.blur);
    this.heatmapNodes.gradient(this.heatmapNodeConfig.colorGradient());
    this.heatmapNodes.data(this.heatmapNodeData);
    // this.heat.draw(this.heatmapConfig.minOpacity); // leads to extreme memory leak!
    // this.isHeatmapChanged = true;
    this.heatmapNormal.draw(this.heatmapNormalConfig.minOpacity);
    this.heatmapNodes.draw();
    this.heatmapCanvasNormalTexture.needsUpdate = true;
    this.heatmapCanvasNodeTexture.needsUpdate = true;
  }

  private refreshHeatmap() {
    try {
      this.heatmapNormal.radius(this.heatmapNormalConfig.radius, this.heatmapNormalConfig.blur);
      this.heatmapNormal.gradient(this.heatmapNormalConfig.colorGradient());
      this.heatmapNormal.draw(this.heatmapNormalConfig.minOpacity);
      this.heatmapNodes.draw();
      this.heatmapCanvasNormalTexture.needsUpdate = true;
      this.heatmapCanvasNodeTexture.needsUpdate = true;
      console.log('heatmapNormal refreshed!');
    } catch (error) {
      console.log('heatmap refresh failed', error);
    }

  }

  public testingToggler(e) {
    this.showBrainView = !e['checked'];
    console.log('this.showBrainView', this.showBrainView);
    this.setup();
  }

  private planeLookAtCam() {
    setInterval(() => {
      this.brainUVMapMesh.lookAt(this.views[0]['camera'].position);
    }, 1);
  }

  private setup() {
    this.setupScene();
    this.setupCamera();
    this.setupRenderer();
    this.setupUtilities();
    // this.planeLookAtCam();
  }

  private setupScene() {
    // this.scene = new THREE.Scene();

    if (this.showBrainView) {
      // const sceneObjects = this.brainComponent.setupBrain();
      // sceneObjects.forEach(element => {
      //   console.log("element",element);
      //   this.scene.add(element);
      // });
      this.scene = this.brainComponent.setupBrain();
      this.scene.children.forEach(element => {
        if (element.name === 'planeMesh') {
          this.brainUVMapMesh = <THREE.Mesh>element;
          // this.brainUVMapMesh.visible = true;
        }
      });

      this.heatCanvas = this.brainComponent.getHeatmapCanvas;
      this.heatCanvasNodes = this.brainComponent.getHeatmapCanvasNodes;
      this.heatmapNormal = simpleheat(this.heatCanvas);
      this.heatmapNodes = simpleheat(this.heatCanvasNodes);
    } else {
      // this.scene = this.moleculeComponent.setupMolecule(this.networkService.getMoleculeStruct);
    }
  }

  private setupCamera() {

    for (const view of this.views) {

      const camera = new THREE.PerspectiveCamera(view.fov, window.innerWidth / window.innerHeight, 1, 2000);
      camera.position.fromArray(view.eye);
      camera.up.fromArray(view.up);
      view['camera'] = camera;
      this.scene.add(camera);
      const directionalLight = new THREE.DirectionalLight(0xffeedd);
      // const directionalLight = new this.DirectionalLight(0xffffff);
      // directionalLight.position.set( 0, 0, 1 );
      camera.add(directionalLight);
    }

    // old backup:
    // const aspectRatio = this.getAspectRatio();
    // this.camera = new this.PerspectiveCamera(
    //   this.fieldOfView,
    //   aspectRatio,
    //   this.nearClippingPane,
    //   this.farClippingPane
    // );
    // this.camera.position.z = 3;

    // this.scene.add(this.camera);

    const ambientLight = new THREE.AmbientLight(0x444444);
    this.scene.add(ambientLight);


  }

  private setupRenderer() {
    // try {
    //   document.body.removeChild(this.renderer.domElement);
    // } catch (error) {
    //   console.log('tried to remove renderer');
    // }
    if (this.showBrainView) {
      // console.log('in renderer:', this.heatCanvas);
      this.renderer = new THREE.WebGLRenderer({
        antialias: true
      });
    } else {
      this.renderer = new THREE.CSS3DRenderer();
    }
    this.renderer.setSize(window.innerWidth, window.innerHeight - 67.125);
    // console.log('this.heatCanvas', this.heatCanvas);

    // this.renderer.setSize(this.heatCanvas.clientWidth, this.heatCanvas.clientHeight);
    console.log('renderer', this.renderer);
    console.log('this.renderer.domElement', this.renderer.domElement);

    // document.body.appendChild(this.renderer.domElement);
    document.getElementById('subAppsContainer').appendChild(this.renderer.domElement);


    /*const component: SceneComponent = this;
    (function render() {
      requestAnimationFrame(render);
      component.renderer.render(component.scene, component.camera);
    }());*/

    const render = () => {
      requestAnimationFrame(render);
      // if (this.redraw && this.showBrainView && this.isHeatmapChanged) {
      //   console.log('redrawing heatmap');
      //   this.isHeatmapChanged = false;
      //   // always let 2DBrainPlane look at camera
      //   // this.brainUVMapMesh.lookAt(this.camera.position);
      //   // last layer has no connections to "next" layer
      //   // if (stepperCnt < convertedLayerObjs.length - 1) {
      //   // }

      //   this.redraw = false;
      // } else if (this.redraw && !this.showBrainView) {
      //   // render molecule
      // } else if (this.fpsHack >= 60) {
      //   this.fpsHack = 0;
      //   this.redraw = true;
      // }
      // this.fpsHack++;
      // console.log('trying to render this scene:', this.scene);
      // this.renderer.render(this.scene, this.camera);
      for (const view of this.views) {
        const camera = view['camera'];
        // view.updateCamera(camera, this.scene, mouseX, mouseY);
        const left = Math.floor(window.innerWidth * view.left);
        const top = Math.floor(window.innerHeight * view.top);
        const width = Math.floor(window.innerWidth * view.width);
        const height = Math.floor(window.innerHeight * view.height);
        this.renderer.setViewport(left, top, width, height);
        this.renderer.setScissor(left, top, width, height);
        this.renderer.setScissorTest(true);
        this.renderer.setClearColor(view.background);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        this.renderer.render(this.scene, camera);
      }
      // this.renderer.dispose();
    };
    render();
  }

  private setupUtilities() {
    // ==================================================
    // controls
    // ==================================================
    this.controls = new THREE.OrbitControls(this.views[0]['camera'], this.renderer.domElement);
    this.controls.rotateSpeed = 1.0;
    this.controls.zoomSpeed = 1.2;
  }

  public updateHeatmapCanvasTexture(updatedHeatmapCanvasTexture, type) {
    if (type === 'normal') {
      this.heatmapCanvasNormalTexture = updatedHeatmapCanvasTexture;
    } else if (type === 'node') {
      this.heatmapCanvasNodeTexture = updatedHeatmapCanvasTexture;
    }
  }

  private getAspectRatio(): number {
    return window.innerWidth / window.innerHeight;
  }


  // ==================================================
  // playground
  // ==================================================


  get layers(): FormArray {
    return this.playgroundForm.get('layers') as FormArray;
  }

  createForm() {
    this.playgroundForm = this.fb.group({
      batch_size_train: [0, [Validators.required, Validators.min(0)]],
      batch_size_test: [0, [Validators.required, Validators.min(0)]],
      // numBatches: [0, [Validators.required, Validators.min(0)]],
      num_epochs: [0, [Validators.required, Validators.min(0)]],

      learning_rate: ['', Validators.required],
      layerCount: [0, [Validators.required, Validators.min(0)]],

      layers: this.fb.array([])
    });

    this.playgroundForm.patchValue({
      batch_size_train: this.playgroundData.batchSize,
      batch_size_test: this.playgroundData.batchSize,
      // numBatches: this.playgroundData.numBatches,
      num_epochs: this.playgroundData.epoch,

      learning_rate: this.playgroundData.learningRates[0].value,
      layerCount: this.playgroundData.layerCount
    });

    this.playgroundForm.setControl('layers', this.fb.array(
      this.playgroundService.arrayOne(this.playgroundData.layerCount).map(layer => this.fb.group({
        unitCount: [1, [Validators.required, Validators.min(1)]]
      }))
    ));

    this.resetForm();
    this.layerCountChange();
  }

  trainNetwork() {
    const captureForm: any = JSON.parse(JSON.stringify(this.playgroundForm.value));

    const objToSend = {
      learning_rate: +captureForm.learning_rate,
      batch_size_train: +captureForm.batch_size_train,
      batch_size_test: +captureForm.batch_size_test,
      num_epochs: +captureForm.num_epochs,
      layers: []
    };

    captureForm.layers.forEach(layer => {
      objToSend.layers.push(layer.unitCount);
    });

    // console.log("From frontend:");
    // console.log(objToSend);

    this.playgroundService.trainNetwork(objToSend).subscribe(result => {

      this.vizWeights = result;
      this.scanForFiles(true);

    });
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
      batch_size: this.playgroundData.batchSize,
      // numBatches: this.playgroundData.numBatches,
      num_epochs: this.playgroundData.epoch,
      layerCount: this.playgroundData.layerCount
    });

    while (this.layers.length !== 0) { this.layers.removeAt(0); }
    for (let index = 0; index < this.playgroundForm.get('layerCount').value; index++) {
      this.layers.push(this.fb.group({
        unitCount: [1, [Validators.required, Validators.min(1)]]
      }));
    }
    this.resetForm();
  }

  resetForm() {
    for (let i = 0; i < this.playgroundData.layerCount; i++) {
      const currLayer = this.playgroundData.mnistLayers[i];

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
              unitCount: [1, [Validators.required, Validators.min(1)]]
            }));
          }
        } else {
          for (let i = this.layers.controls.length; i > +this.playgroundForm.get('layerCount').value; i--) {
            this.layers.removeAt(i - 1);
          }
        }
      }
    );
  }

  delLayer(i: number) {
    this.layers.removeAt(i);
    this.playgroundForm.get('layerCount').setValue(this.layers.length);
  }
  // ==================================================

  // ==================================================
  // MQTT
  // ==================================================

  public unsafePublish(topic: string, message: string): void {
    // this._mqttService.unsafePublish(topic, message, { qos: 1, retain: true });
  }

  public ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
