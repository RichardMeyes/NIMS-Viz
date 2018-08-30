import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';

import * as THREE from 'three';
import 'three/examples/js/loaders/OBJLoader.js';

@Component({
    selector: 'app-brain',
    templateUrl: './brain.component.html',
    styleUrls: ['./brain.component.scss']
})
export class BrainComponent implements OnInit, OnDestroy {
    @Output() updatedHeatmapCanvasNormalTexture = new EventEmitter<THREE.CanvasTexture>();
    @Output() updatedHeatmapCanvasNodeTexture = new EventEmitter<THREE.CanvasTexture>();
    private scene: THREE.Scene;
    private objectLoader;

    private vertexShader;
    private fragmentShader;

    private brainMaterial: THREE.ShaderMaterial;
    private normalMaterial: THREE.ShaderMaterial;
    private nodeMaterial: THREE.ShaderMaterial;

    htmlCanvas: any;
    htmlCanvasNodes: any;

    public get getHeatmapCanvas(): string {
        return this.htmlCanvas;
    }
    public get getHeatmapCanvasNodes(): string {
        return this.htmlCanvasNodes;
    }

    constructor() { }

    ngOnInit() {
        this.vertexShader = `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        void main() {
            vUv = uv;
            vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
            vNormal = normalize( normalMatrix * normal );
            vViewPosition = -mvPosition.xyz;
            // gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
            gl_Position = projectionMatrix * mvPosition;
        }`;

        this.fragmentShader = `
        uniform sampler2D brainTexture;
        uniform sampler2D heatmapTexture;
        uniform sampler2D alphaTexture;
        uniform vec3 color;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewPosition;

        void main() {
            vec4 tc = vec4(color.r, color.g, color.b, 1.0 );
            // brain texture
            vec4 brain = texture2D( brainTexture, vUv );
            // heatmap texture
            vec4 heatmap = texture2D( heatmapTexture, vUv );
            // alpha map
            float alpha = texture2D( alphaTexture, vUv ).r;

            // hack in a fake pointlight at camera location, plus ambient
            vec3 normal = normalize( vNormal );
            vec3 lightDir = normalize( vViewPosition );

            float dotProduct = max( dot( normal, lightDir ), 0.0 ) + 0.2;
            vec4 mix_c = heatmap + tc * heatmap.a;

            // correct one without alpha:
            // gl_FragColor = vec4( mix( brain.rgb, mix_c.xyz, heatmap.a ), 1.0 ) * dotProduct;
            gl_FragColor = vec4( mix( brain.rgb, heatmap.xyz, heatmap.a ), 1.0 ) * dotProduct;
            // correct one with alpha:
            //gl_FragColor = vec4( mix( brain, heatmap, alpha ).rgb * dotProduct, 1.0 );
            //gl_FragColor = vec4( mix( brain.rgb, heatmap.rgb, heatmap.a ), 1.0 ) * dotProduct;
            // old one to mix without looking good
            // gl_FragColor = mix( brain, heatmap, alpha );
        }`;
    }

    public setupBrain() {
        this.scene = new THREE.Scene();
        this.loadTexture();
        this.loadObject();
        return this.scene;
    }

    private loadTexture() {
        this.htmlCanvas = document.getElementById('canvHeatmap');
        this.htmlCanvasNodes = document.getElementById('canvHeatmapNodes');

        const heatmapCanvasTexture = new THREE.CanvasTexture(this.htmlCanvas, THREE.UVMapping);
        const heatmapCanvasNodeTexture = new THREE.CanvasTexture(this.htmlCanvasNodes, THREE.UVMapping);
        this.updatedHeatmapCanvasNormalTexture.emit(heatmapCanvasTexture);
        this.updatedHeatmapCanvasNodeTexture.emit(heatmapCanvasNodeTexture);
        const greyscaleTexture = new THREE.TextureLoader().load('/assets/textures/brain_tex_greyscale.jpg');
        const greyscaleTextureIsolated = new THREE.TextureLoader().load('/assets/textures/brain_tex_greyscale_isolated.jpg');
        const alphaTexture = new THREE.TextureLoader().load('/assets/textures/heatmap_alphamap.jpg');
        // uniforms
        const uniformsBrain = {
            color: { type: 'c', value: new THREE.Color(0x000000) },
            brainTexture: { type: 't', value: greyscaleTexture },
            heatmapTexture: { type: 't', value: heatmapCanvasTexture },
            alphaTexture: { type: 't', value: alphaTexture }
        };

        const uniformsNormal = {
            color: { type: 'c', value: new THREE.Color(0x000000) },
            brainTexture: { type: 't', value: greyscaleTextureIsolated },
            heatmapTexture: { type: 't', value: heatmapCanvasTexture },
            alphaTexture: { type: 't', value: alphaTexture }
        };

        // uniforms
        const uniformsNodesOnly = {
            color: { type: 'c', value: new THREE.Color(0x000000) },
            brainTexture: { type: 't', value: greyscaleTextureIsolated },
            heatmapTexture: { type: 't', value: heatmapCanvasNodeTexture },
            alphaTexture: { type: 't', value: alphaTexture }
        };

        // material
        this.brainMaterial = new THREE.ShaderMaterial({
            uniforms: uniformsBrain,
            vertexShader: this.vertexShader,
            fragmentShader: this.fragmentShader
        });
        this.brainMaterial.name = 'brainmaterial';

        // material
        this.normalMaterial = new THREE.ShaderMaterial({
            uniforms: uniformsNormal,
            vertexShader: this.vertexShader,
            fragmentShader: this.fragmentShader
        });

        // material
        this.nodeMaterial = new THREE.ShaderMaterial({
            uniforms: uniformsNodesOnly,
            vertexShader: this.vertexShader,
            fragmentShader: this.fragmentShader
        });
    }

    private loadObject() {
        this.objectLoader = new THREE.OBJLoader();
        this.objectLoader.load('./assets/models/obj/Brain_Model_2.obj',
            (obj) => {
                obj.traverse((child) => {
                    if (child instanceof THREE.Mesh && child.name.includes('Brain_Part_06')) {
                        // console.log('mesh', child);
                        child.material = this.brainMaterial;
                    } else if (child instanceof THREE.Mesh) {
                        child.visible = false;
                    }
                });

                obj.name = 'brainobject';
                obj.position.y = -0.5;
                obj.rotation.y = Math.PI / 2;
                this.scene.add(obj);
            },
            (xhr) => {
                //  console.log((xhr.loaded / xhr.total * 100) + '% loaded');
            },
            () => { console.error('An error happened'); }
        );
        // create plane to add 2Duvmap texture
        const plane2DGeo = new THREE.PlaneGeometry(2, 2);
        const plane2DGeoClone = plane2DGeo.clone();
        const plane2DMesh = new THREE.Mesh(plane2DGeo, this.normalMaterial);
        const plane2DMeshNodes = new THREE.Mesh(plane2DGeoClone, this.nodeMaterial);
        plane2DMesh.name = 'planeMesh';
        plane2DMeshNodes.name = 'planeMesh';
        // const plane2DClone = plane2DMesh.clone();
        plane2DMesh.position.z = 50;
        plane2DMeshNodes.position.x = 4;
        plane2DMeshNodes.position.z = 50;
        this.scene.add(plane2DMesh);
        this.scene.add(plane2DMeshNodes);
    }

    ngOnDestroy() {
        console.log('ngOnDestroy BrainComponent');
    }
}
