import { Component, OnInit, ViewChild, AfterViewInit, HostListener, Renderer2 } from '@angular/core';
import { NetworkService } from '../network.service';

import * as THREE from 'three';
import * as Stats from 'stats.js/build/stats.min.js';
import * as simpleheat from "simpleheat/simpleheat.js";

import '../../customs/enable-three-examples.js';
import 'three/examples/js/loaders/OBJLoader.js';
import 'three/examples/js/controls/OrbitControls';


@Component({
  selector: 'app-scene',
  templateUrl: './scene.component.html',
  styleUrls: ['./scene.component.scss']
})
export class SceneComponent implements OnInit, AfterViewInit {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: THREE.OrbitControls;

  private cube: THREE.Mesh;

  private windowWidth: number;
  private windowHeight: number;
  private fieldOfView: number = 45;
  private nearClippingPane: number = 1;
  private farClippingPane: number = 2000;

  private weights: any;

  @ViewChild('canvas') private canvasRef;

  private get canvas(): HTMLCanvasElement {
    return this.canvasRef.nativeElement;
  }

  @HostListener('window:resize', ['$event'])
  onResize(event) {
    this.windowWidth = window.innerWidth;
    this.windowHeight = window.innerHeight;

    this.camera.aspect = this.windowWidth / this.windowHeight;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(this.windowWidth, this.windowHeight);
  }

  constructor(private networkService: NetworkService, private renderer2: Renderer2) {
    this.networkService.loadFromJson().subscribe(
      (weights) => {
        this.weights = weights;
        console.log(this.weights);
      }
    );
  }

  ngOnInit() { }

  ngAfterViewInit() {
    this.setupScene();
    this.setupCamera();
    this.setupRenderer();
    this.setupUtilities();
  }

  private setupScene() {
    this.scene = new THREE.Scene();

    let objectLoader = new THREE.OBJLoader();
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
    );
  }

  private setupCamera() {
    let aspectRatio = this.getAspectRatio();
    this.camera = new THREE.PerspectiveCamera(
      this.fieldOfView,
      aspectRatio,
      this.nearClippingPane,
      this.farClippingPane
    );
    this.camera.position.z = 3;
    this.scene.add(this.camera);

    let ambientLight = new THREE.AmbientLight(0x444444);
    this.scene.add(ambientLight);

    let directionalLight = new THREE.DirectionalLight(0xffeedd);
    this.camera.add(directionalLight);
  }

  private setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true
    });
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);

    let component: SceneComponent = this;
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
}