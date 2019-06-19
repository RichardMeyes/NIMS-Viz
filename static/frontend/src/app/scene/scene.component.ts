import { Component, OnInit, ViewChild, AfterViewInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { MatTabChangeEvent } from '@angular/material';

import { Subject } from 'rxjs';
import { takeUntil, concatMap, filter } from 'rxjs/operators';

import { DataService } from '../services/data.service';
import { NetworkService } from '../network.service';

import * as THREE from 'three';
import * as simpleheat from 'simpleheat/simpleheat.js';

import '../../customs/enable-three-examples.js';
import 'three/examples/js/renderers/CSS3DRenderer.js';
import 'three/examples/js/controls/OrbitControls';

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
  heatmapNodeConfig;

  singleViewHeight; singleViewWidth; views;
  orbitControllerAreaStyles;

  heatmapCanvasNormalTexture; heatmapCanvasNodeTexture;

  epochSliderConfig;
  heatmapNormalConfig;
  drawFully;

  selectedFile;

  lastHeatmapData;

  destroyed = new Subject<void>();

  constructor(
    private dataService: DataService,
    private networkService: NetworkService,
    public router: Router
  ) { }

  ngOnInit() {
    this.networkService.onMessage()
      .pipe(takeUntil(this.destroyed))
      .subscribe((message: JSON) => {
        const heatmapNormalConfig = this.dataService.optionData.getValue().heatmapNormalConfig;

        const resultHeatmapData = message['resultHeatmapData'];
        const resultWeightMinMax = message['resultWeightMinMax'];

        heatmapNormalConfig.weightValueMin = resultWeightMinMax[0];
        heatmapNormalConfig.weightValueMax = resultWeightMinMax[1];

        this.applyingDataToHeatmaps(resultHeatmapData, heatmapNormalConfig);

        this.lastHeatmapData = resultHeatmapData;
      });

    this.dataService.applyOption
      .pipe(
        takeUntil(this.destroyed),
        filter(val => val === true),
        concatMap(() => {
          this.selectedFile = this.dataService.selectedFile.getValue();
          this.epochSliderConfig = this.dataService.epochSliderConfig.getValue();

          const optionData = this.dataService.optionData.getValue();
          this.heatmapNormalConfig = optionData.heatmapNormalConfig;
          this.drawFully = optionData.drawFully;

          return this.networkService.createHeatmapFromFile(
            this.selectedFile,
            this.epochSliderConfig.epochValue - 1,
            [this.heatmapNormalConfig.weightValueMin, this.heatmapNormalConfig.weightValueMax],
            this.drawFully,
            false,
            this.heatmapNormalConfig.density,
            undefined
          );
        })
      )
      .subscribe(val => {
        if (this.router.url.includes('builder')) { val = this.lastHeatmapData; }
        this.applyingDataToHeatmaps(val, this.heatmapNormalConfig);
      });

    this.dataService.visualize
      .pipe(
        takeUntil(this.destroyed),
        filter(val => val === true),
        concatMap(() => {
          this.selectedFile = this.dataService.selectedFile.getValue();

          const optionData = this.dataService.optionData.getValue();
          this.heatmapNormalConfig = optionData.heatmapNormalConfig;
          this.drawFully = optionData.drawFully;

          return this.networkService.createHeatmapFromFile(
            this.selectedFile,
            0,
            [this.heatmapNormalConfig.weightValueMin, this.heatmapNormalConfig.weightValueMax],
            this.drawFully,
            true,
            this.heatmapNormalConfig.density,
            undefined
          );
        })
      )
      .subscribe(val => {
        this.applyingDataToHeatmaps(val, this.heatmapNormalConfig);
      });

    this.dataService.epochSliderChange
      .pipe(
        takeUntil(this.destroyed),
        filter(val => val === true),
        concatMap(() => {
          this.selectedFile = this.dataService.selectedFile.getValue();
          this.epochSliderConfig = this.dataService.epochSliderConfig.getValue();

          const optionData = this.dataService.optionData.getValue();
          this.heatmapNormalConfig = optionData.heatmapNormalConfig;
          this.drawFully = optionData.drawFully;

          return this.networkService.createHeatmapFromFile(
            this.selectedFile,
            this.epochSliderConfig.epochValue - 1,
            [this.heatmapNormalConfig.weightValueMin, this.heatmapNormalConfig.weightValueMax],
            this.drawFully,
            false,
            this.heatmapNormalConfig.density,
            undefined
          );
        })
      )
      .subscribe(val => {
        this.applyingDataToHeatmaps(val, this.heatmapNormalConfig);
      });















    this.heatmapNodeConfig = this.dataService.heatmapNodeConfig;

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

  applyingDataToHeatmaps(data, heatmapNormalConfig) {
    if (this.heatmapNormal && this.heatmapNodes) {
      const heatmapNodeData = data['heatmapNodeData'];
      const heatmapNormalData = data['heatmapNormalData'];
      const deltaMinMax = heatmapNormalConfig.weightValueMax - heatmapNormalConfig.weightValueMin;
      // Trigger 1 initial value is 40% of delta min-max
      heatmapNormalConfig.color1Trigger = parseFloat((heatmapNormalConfig.weightValueMin +
        deltaMinMax * 0.4).toFixed(4));
      // Trigger 2 initial value is 60% of delta min-max (effectively between 40% of trigger 1 and 60%)
      heatmapNormalConfig.color2Trigger = parseFloat((heatmapNormalConfig.weightValueMin +
        deltaMinMax * 0.6).toFixed(4));
      heatmapNormalConfig.color3Trigger = heatmapNormalConfig.weightValueMax;
      // NodeConfig Trigger is one color for all values. That's the reason for 1.0 => 100%
      // this.heatmapNodeConfig.color1Trigger = 1.0;
      this.heatmapNormal.clear();
      this.heatmapNodes.clear();
      // set radius and blur radius
      this.heatmapNormal.radius(heatmapNormalConfig.radius, heatmapNormalConfig.blur);
      this.heatmapNormal.gradient(heatmapNormalConfig.colorGradient());
      this.heatmapNormal.data(heatmapNormalData);

      this.heatmapNodes.radius(this.heatmapNodeConfig.radius, this.heatmapNodeConfig.blur);
      this.heatmapNodes.gradient(this.heatmapNodeConfig.colorGradient());
      this.heatmapNodes.data(heatmapNodeData);


      this.heatmapNormal.draw(heatmapNormalConfig.minOpacity);
      this.heatmapNodes.draw();
      this.heatmapCanvasNormalTexture.needsUpdate = true;
      this.heatmapCanvasNodeTexture.needsUpdate = true;
    }
  }

  tabChanged(tabChangeEvent: MatTabChangeEvent) {
    this.dataService.activeSceneTab.next(tabChangeEvent.index);
  }

  ngOnDestroy() {
    this.destroyed.next();
  }
}
