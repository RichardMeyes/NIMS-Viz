import { Component, OnInit, ViewChild, AfterViewInit, HostListener, Renderer2, Input } from '@angular/core';
import { NetworkService } from '../network.service';

import * as THREE from 'three';
import * as Stats from 'stats.js/build/stats.min.js';
import * as simpleheat from 'simpleheat/simpleheat.js';

import '../../customs/enable-three-examples.js';
import 'three/examples/js/renderers/CSS3DRenderer.js';
import 'three/examples/js/loaders/OBJLoader.js';
import 'three/examples/js/controls/OrbitControls';

// import { BrainComponent } from './brain/brain.component';


@Component({
  selector: 'app-scene',
  templateUrl: './scene.component.html',
  styleUrls: ['./scene.component.scss']
})
export class SceneComponent implements OnInit, AfterViewInit {

  @ViewChild('snav') snav;
  // @ViewChild('canvas') private canvasRef;
  @ViewChild('brainComponent') brainComponent;
  @ViewChild('moleculeComponent') moleculeComponent;
  @Input() fixedTopGap: boolean;
  private scene: THREE.Scene;
  private scenes: THREE.Scene[] = [];
  // private camera: THREE.PerspectiveCamera;
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
  private showBrainView = true;
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

  // private get getCanvas(): HTMLCanvasElement {
  //   return this.canvasRef.nativeElement;
  // }

  files = [
    { value: 'model1.h5', viewValue: 'File 1' },
    { value: 'model2.h5', viewValue: 'File 2' },
    { value: 'model3.h5', viewValue: 'File 3' }
  ];

  private selectedFile;

  layerCount = 15;
  nodeCount = 15;
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
  heatCanvas: any;
  brainUVMapMesh: THREE.Mesh;

  views = [
    // brainobj
    {
      left: 0,
      top: 0,
      width: 0.5,
      height: 1.0,
      background: new THREE.Color(0.5, 0.5, 0.7),
      eye: [0, 0, 3],
      up: [0, 1, 0],
      fov: 30
      // updateCamera: function (camera, scene, mouseX, mouseY) {
      //   camera.position.x += mouseX * 0.05;
      //   camera.position.x = Math.max(Math.min(camera.position.x, 2000), -2000);
      //   camera.lookAt(scene.position);
      // }
    },
    // 2Dbraingreyscale
    {
      left: 0.5,
      top: 0,
      width: 0.5,
      height: 0.5,
      background: new THREE.Color(0.7, 0.5, 0.5),
      eye: [0, 0, 52],
      up: [0, 0, 1],
      fov: 45
      // updateCamera: function ( camera, scene, mouseX, mouseY ) {
      // camera.position.x -= mouseX * 0.05;
      // camera.position.x = Math.max( Math.min( camera.position.x, 2000 ), -2000 );
      // camera.lookAt( camera.position.clone().setY( 0 ) );
      // }
    }
    // {
    //   left: 0.5,
    //   top: 0.5,
    //   width: 0.5,
    //   height: 0.5,
    //   background: new THREE.Color(0.5, 0.7, 0.7),
    //   eye: [1400, 800, 1400],
    //   up: [0, 1, 0],
    //   fov: 60
    //   // updateCamera: function (camera, scene, mouseX, mouseY) {
    //   //   camera.position.y -= mouseX * 0.05;
    //   //   camera.position.y = Math.max(Math.min(camera.position.y, 1600), -1600);
    //   //   camera.lookAt(scene.position);
    //   // }
    // }
  ];

  @HostListener('window:resize', ['$event'])
  onResize(event) {
    this.windowWidth = window.innerWidth;
    this.windowHeight = window.innerHeight;

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

  constructor(private networkService: NetworkService, private renderer2: Renderer2) {
    this.networkService.loadFromJson().subscribe(
      (weights) => {
        this.weights = weights;
        // console.log(this.weights);
        this.networkService.createNetworkFromWeights(this.weights);
        this.setup();
      }
    );
  }

  ngOnInit() {
    this.selectedFile = this.files[0].value;
    // console.log('ngOnInit');
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

  private planeLookAtCam() {
    setInterval(() => {
      this.brainUVMapMesh.lookAt(this.views[0]['camera'].position);
    }, 1);
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
    // this.planeLookAtCam();
  }

  private setupScene() {
    this.scene = new THREE.Scene();

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
      // console.log('taken heatcanvas', this.heatCanvas);
      // draw heatmap
      this.heat = simpleheat(this.heatCanvas);
    } else {
      this.scene = this.moleculeComponent.setupMolecule(this.networkService.getMoleculeStruct);
    }
  }

  private setupCamera() {


    for (const view of this.views) {
      console.log('view', view);

      const camera = new THREE.PerspectiveCamera(view.fov, window.innerWidth / window.innerHeight, 1, 2000);
      camera.position.fromArray(view.eye);
      camera.up.fromArray(view.up);
      view['camera'] = camera;
      this.scene.add(camera);
      const directionalLight = new THREE.DirectionalLight(0xffeedd);
      // const directionalLight = new THREE.DirectionalLight(0xffffff);
      // directionalLight.position.set( 0, 0, 1 );
      camera.add(directionalLight);
    }

    // old backup:
    // const aspectRatio = this.getAspectRatio();
    // this.camera = new THREE.PerspectiveCamera(
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
        canvas: this.heatCanvas.nativeElement,
        antialias: true
      });
    } else {
      this.renderer = new THREE.CSS3DRenderer();
    }
    this.renderer.setSize(window.innerWidth, window.innerHeight - 67.125);
    // console.log('this.heatCanvas', this.heatCanvas);

    // this.renderer.setSize(this.heatCanvas.clientWidth, this.heatCanvas.clientHeight);
    // console.log('renderer', this.renderer);
    document.body.appendChild(this.renderer.domElement);
    // document.getElementById( 'testcanvas').appendChild(this.renderer.domElement);


    /*const component: SceneComponent = this;
    (function render() {
      requestAnimationFrame(render);
      component.renderer.render(component.scene, component.camera);
    }());*/

    const render = () => {
      requestAnimationFrame(render);
      if (this.redraw && this.showBrainView) {
        // always let 2DBrainPlane look at camera
        // this.brainUVMapMesh.lookAt(this.camera.position);
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
    // console.log('render called');
  }

  private setupUtilities() {
    // ==================================================
    // controls
    // ==================================================
    this.controls = new THREE.OrbitControls(this.views[0]['camera'], this.renderer.domElement);
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
}
