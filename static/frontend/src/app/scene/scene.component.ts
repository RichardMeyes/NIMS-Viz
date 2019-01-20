import {
  Component, OnInit, ViewChild, AfterViewInit, HostListener, Renderer2, Input, ChangeDetectorRef, OnDestroy, ViewEncapsulation
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
import { generate, Subscription, Subject } from 'rxjs';
import { update } from '@tensorflow/tfjs-layers/dist/variables';
import { Playground, TfjsLayer } from '../playground.model';
import { FormGroup, FormBuilder, Validators, FormArray } from '@angular/forms';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { DataService } from '../services/data.service';
// import { MqttService, IMqttMessage } from 'ngx-mqtt';


@Component({
  selector: 'app-scene',
  templateUrl: './scene.component.html',
  styleUrls: ['./scene.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class SceneComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('brainComponent') brainComponent;

  scene: THREE.Scene;
  brainUVMapMesh: THREE.Mesh;
  renderer: THREE.WebGLRenderer;
  controls: THREE.OrbitControls;

  heatCanvas; heatCanvasNodes;
  heatmapNormal; heatmapNodes;

  singleViewHeight; singleViewWidth; views;
  orbitControllerAreaStyles;

  heatmapCanvasNormalTexture; heatmapCanvasNodeTexture;

  vizTopology: any;
  vizWeights: any;

  destroyed = new Subject<void>();

  constructor(
    private dataService: DataService,
    private networkService: NetworkService
  ) { }

  ngOnInit() {
    this.networkService.onMessage()
      .pipe(takeUntil(this.destroyed))
      .subscribe((message: JSON) => {
        const resultWeights = message['resultWeights'];
        this.dataService.vizWeights.next(resultWeights);
      });


    this.dataService.vizTopology
      .pipe(takeUntil(this.destroyed))
      .subscribe(val => { this.vizTopology = val; });

    this.dataService.vizWeights
      .pipe(takeUntil(this.destroyed))
      .subscribe(val => { this.vizWeights = val; });

    this.singleViewHeight = 1;
    this.singleViewWidth = 0.5;
    this.views = [
      // top left brainobj
      {
        left: 0,
        top: 0,
        width: this.singleViewWidth,
        height: this.singleViewHeight,
        background: new THREE.Color('#303030'),
        eye: [0, 0, 3],
        up: [0, 1, 0],
        fov: 45
      },
      // top right 2Dbraingreyscale
      {
        left: 0.5,
        top: 0,
        width: this.singleViewWidth,
        height: this.singleViewHeight,
        background: new THREE.Color('#303030'),
        eye: [-0.25, 0.10, 51],
        up: [0, 0, 1],
        fov: 80
      }
    ];
    this.orbitControllerAreaStyles = {
      'position': 'absolute',
      'width': '0px',
      'height': '0px'
    };
  }

  ngAfterViewInit() {
    this.setup();
  }

  setup() {
    this.setupScene();
    this.setupCamera();
    this.setupRenderer();
    this.setupUtilities();
  }

  setupScene() {

    this.scene = this.brainComponent.setupBrain();
    this.scene.children.forEach(element => {
      if (element.name === 'planeMesh') {
        this.brainUVMapMesh = <THREE.Mesh>element;
      }
    });

    this.heatCanvas = this.brainComponent.getHeatmapCanvas;
    this.heatCanvasNodes = this.brainComponent.getHeatmapCanvasNodes;
    this.heatmapNormal = simpleheat(this.heatCanvas);
    this.heatmapNodes = simpleheat(this.heatCanvasNodes);

  }

  setupCamera() {
    for (const view of this.views) {
      const camera = new THREE.PerspectiveCamera(view.fov, window.innerWidth / window.innerHeight, 1, 1000);
      camera.position.fromArray(view.eye);
      camera.up.fromArray(view.up);
      view['camera'] = camera;
      this.scene.add(camera);
      const directionalLight = new THREE.DirectionalLight(0xffeedd);
      camera.add(directionalLight);
    }

    const ambientLight = new THREE.AmbientLight(0x444444);
    this.scene.add(ambientLight);
  }

  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight - 67.125);

    this.orbitControllerAreaStyles.width = (window.innerWidth * this.views[0].width) + 'px';
    this.orbitControllerAreaStyles.height = (window.innerHeight * this.views[0].height) + 'px';
    document.getElementById('subAppsContainer').appendChild(this.renderer.domElement);

    const render = () => {
      requestAnimationFrame(render);
      for (const view of this.views) {
        const camera = view['camera'];
        const left = Math.floor(window.innerWidth * view.left);
        const top = Math.floor(window.innerHeight * view.top);
        const width = Math.floor(window.innerWidth * view.width);
        const height = Math.floor(window.innerHeight * view.height);
        this.renderer.setViewport(left, top, width, height);
        this.renderer.setScissor(left, top, width, height);
        this.renderer.setScissorTest(true);
        this.renderer.setClearColor(view.background, 1);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        this.renderer.render(this.scene, camera);
      }
    };
    render();
  }

  setupUtilities() {
    this.controls = new THREE.OrbitControls(this.views[0]['camera'], document.getElementById('orbitControlArea'));
    this.controls.rotateSpeed = 1.0;
    this.controls.zoomSpeed = 1.2;
  }

  updateHeatmapCanvasTexture(updatedHeatmapCanvasTexture, type) {
    if (type === 'normal') {
      this.heatmapCanvasNormalTexture = updatedHeatmapCanvasTexture;
    } else if (type === 'node') {
      this.heatmapCanvasNodeTexture = updatedHeatmapCanvasTexture;
    }
  }

  public ngOnDestroy() {
    this.destroyed.next();
  }
}
