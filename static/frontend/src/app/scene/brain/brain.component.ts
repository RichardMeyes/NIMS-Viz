import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';

import * as THREE from 'three';
// import * as OBJLoader from 'three-obj-loader';
// OBJLoader(THREE);
// import {Scene, CanvasTexture, ShaderMaterial, Texture, TextureLoader, UVMapping, Color, Mesh, PlaneGeometry} from 'three';
import 'three/examples/js/loaders/OBJLoader.js';
// import 'three/examples/js/controls/OrbitControls.js';


@Component({
    selector: 'app-brain',
    templateUrl: './brain.component.html',
    styleUrls: ['./brain.component.scss']
})
export class BrainComponent implements OnInit, OnDestroy {
    @Output() updatedHeatmapCanvasNormalTexture = new EventEmitter<THREE.CanvasTexture>();
    @Output() updatedHeatmapCanvasNodeTexture = new EventEmitter<THREE.CanvasTexture>();
    @Output() updatedHeatmapNormalData = new EventEmitter<any>();
    @Output() updatedHeatmapNodeData = new EventEmitter<any>();
    // private THREE;
    private traversePolygonsForGeometries;
    private scene: THREE.Scene;
    private objectLoader;
    private heatmapNormalData = [];
    private heatmapNodeData = [];

    // amount (-1) of points that should be drawn per connection / between nodes
    private density = 5; // -> 4 points

    private heatmapCanvasResolution = 1.0; // 8.0;

    private vertexShader;
    private fragmentShader;

    private brainMaterial: THREE.ShaderMaterial;
    private normalMaterial: THREE.ShaderMaterial;
    private nodeMaterial: THREE.ShaderMaterial;

    htmlCanvas: any;
    htmlCanvasNodes: any;
    networkReductionFactor: any;
    layerObjs: any;
    layers: any;
    currentPosition: number;
    finishedLayers: any;
    asyncInterval: any;
    callCounter = 0;
    public get getHeatmapCanvas(): string {
        return this.htmlCanvas;
    }
    public get getHeatmapCanvasNodes(): string {
        return this.htmlCanvasNodes;
    }


    private demoConfig = {
        layerCount: 2,
        nodeCount: 3,
        activateEdgeCase: false
    };
    greyscaleTexture: THREE.Texture;

    constructor() { }

    ngOnInit() {

        // this.setSpriteMaterial();

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
        // Recursively traverse through the model.
        // node = modelobject, uvx = uvcoord x, uvy = uvcoord y
        this.traversePolygonsForGeometries = function (node, uvx, uvy) {
            console.log('trying to retrieve 3D coords...');
            console.log('node', node);
            // console.dir(node);
            // console.debug(node);
            if (node.geometry) {
                console.log('node.geometry', node.geometry);
                // Return a list of triangles that have the point within them.
                // The returned objects will have the x,y,z barycentric coordinates of the point inside the respective triangle
                const baryData = this.annotationTest(uvx, uvy, node.geometry.faceVertexUvs);
                if (baryData.length) {
                    console.log('barydata is not empty!');
                    for (let j = 0; j < baryData.length; j++) {
                        console.log('node.geometry.faces[baryData[j][0]]', node.geometry.faces[baryData[j][0]]);
                        // In my case I only want to return materials with certain names.
                        if (node.geometry.faces[baryData[j][0]].daeMaterial === 'brainmaterial') {
                            // Find the vertices corresponding to the triangle in the model
                            const vertexa = node.geometry.vertices[node.geometry.faces[baryData[j][0]].a];
                            const vertexb = node.geometry.vertices[node.geometry.faces[baryData[j][0]].b];
                            const vertexc = node.geometry.vertices[node.geometry.faces[baryData[j][0]].c];
                            // Sum the barycentric coordinates and apply to the vertices to get the coordinate in local space
                            const worldX = vertexa.x * baryData[j][1] + vertexb.x * baryData[j][2] + vertexc.x * baryData[j][3];
                            const worldY = vertexa.y * baryData[j][1] + vertexb.y * baryData[j][2] + vertexc.y * baryData[j][3];
                            const worldZ = vertexa.z * baryData[j][1] + vertexb.z * baryData[j][2] + vertexc.z * baryData[j][3];
                            const vector = new THREE.Vector3(worldX, worldY, worldZ);
                            // Translate to world space
                            const worldVector = vector.applyMatrix4(node.matrixWorld);
                            return worldVector;
                        }
                    }
                }
            }
            if (node.children) {
                for (let i = 0; i < node.children.length; i++) {
                    const worldVectorPoint = this.traversePolygonsForGeometries(node.children[i], uvx, uvy);
                    if (worldVectorPoint) { return worldVectorPoint; }
                }
            }
        };

        return this.scene;
    }


    // Loops through each face vertex UV item and tests if it is within the triangle.
    private annotationTest(uvX, uvY, faceVertexUletray) {
        console.log('in annotationTest');
        const point = {};
        point['x'] = uvX;
        point['y'] = uvY;
        const results = [];
        console.log('faceVertexUletray', faceVertexUletray);
        for (let i = 0; i < faceVertexUletray[0].length; i++) {
            const result = this.ptInTriangle(point, faceVertexUletray[0][i][0], faceVertexUletray[0][i][1], faceVertexUletray[0][i][2]);
            if (result.length) {
                results.push([i, result[0], result[1], result[2]]);
            }
        }
        return results;
    }

    // This is a standard barycentric coordinate function.
    private ptInTriangle(p, p0, p1, p2) {
        console.log('in ptInTriangle');
        const x0 = p.x;
        const y0 = p.y;
        const x1 = p0.x;
        const y1 = p0.y;
        const x2 = p1.x;
        const y2 = p1.y;
        const x3 = p2.x;
        const y3 = p2.y;

        const b0 = (x2 - x1) * (y3 - y1) - (x3 - x1) * (y2 - y1);
        const b1 = ((x2 - x0) * (y3 - y0) - (x3 - x0) * (y2 - y0)) / b0;
        const b2 = ((x3 - x0) * (y1 - y0) - (x1 - x0) * (y3 - y0)) / b0;
        const b3 = ((x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0)) / b0;

        if (b1 > 0 && b2 > 0 && b3 > 0) {
            return [b1, b2, b3];
        } else {
            return [];
        }
    }

    private loadTexture() {
        // textureLoader = new TextureLoader();
        // texture = textureLoader.load('./assets/textures/heatmap3.jpg', render);
        // texture.wrapS = texture.wrapT = RepeatWrapping;
        this.htmlCanvas = document.getElementById('canvHeatmap');
        this.htmlCanvasNodes = document.getElementById('canvHeatmapNodes');

        // console.log(this.htmlCanvas);
        const heatmapCanvasTexture = new THREE.CanvasTexture(this.htmlCanvas, THREE.UVMapping);
        const heatmapCanvasNodeTexture = new THREE.CanvasTexture(this.htmlCanvasNodes, THREE.UVMapping);
        // this.heatmapCanvasTexture.needsUpdate = true;
        this.updatedHeatmapCanvasNormalTexture.emit(heatmapCanvasTexture);
        this.updatedHeatmapCanvasNodeTexture.emit(heatmapCanvasNodeTexture);
        // const brainTexture = new TextureLoader().load('/assets/textures/brain_tex_grey.jpg');
        const greyscaleTexture = new THREE.TextureLoader().load('/assets/textures/brain_tex_greyscale.jpg');
        const greyscaleTextureIsolated = new THREE.TextureLoader().load('/assets/textures/brain_tex_greyscale_isolated.jpg');
        // brainTexture.needsUpdate = true;
        const alphaTexture = new THREE.TextureLoader().load('/assets/textures/heatmap_alphamap.jpg');
        // alphaTexture.needsUpdate = true;
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

        // https://codepen.io/rauluranga/pen/RNzboz
        // http://adndevblog.typepad.com/cloud_and_mobile/2016/07/projecting-dynamic-textures-onto-flat-surfaces-with-threejs.html
        // https://codepen.io/PierfrancescoSoffritti/pen/wobPVJ
        // https://stackoverflow.com/questions/16287547/multiple-transparent-textures-on-the-same-mesh-face-in-three-js#16897178
        // https://stackoverflow.com/questions/49533486/combine-materials-textures-with-alpha-maps
    }

    private loadObject() {
        // const loadedObjects = [];
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
            (xhr) => { console.log((xhr.loaded / xhr.total * 100) + '% loaded'); },
            (err) => { console.error('An error happened'); }
        );
        // create plane to add 2Duvmap texture
        const plane2DGeo = new THREE.PlaneGeometry(2, 2);
        const plane2DGeoClone = plane2DGeo.clone();
        const plane2DMesh = new THREE.Mesh(plane2DGeo, this.normalMaterial);
        const plane2DMeshNodes = new THREE.Mesh(plane2DGeoClone, this.nodeMaterial);
        plane2DMesh.name = 'planeMesh';
        plane2DMeshNodes.name = 'planeMesh';
        // const plane2DClone = plane2DMesh.clone();
        // plane2DMesh.visible = false;
        plane2DMesh.position.z = 50;
        plane2DMeshNodes.position.x = 4;
        plane2DMeshNodes.position.z = 50;
        this.scene.add(plane2DMesh);
        this.scene.add(plane2DMeshNodes);
    }

    private animateNextStep(convertedLayerObjs, layerID) {
        // add heatmapdata from layerID to alrdy existing data
        const connections = convertedLayerObjs[layerID].connections;
        for (let i = 0; i < connections.length; i++) {
            for (let j = 0; j < connections[i].length; j++) {
                this.heatmapNormalData.push(connections[i][j]);
            }
        }
    }


    public startCalculation() {
        // Reset current position to zero
        this.currentPosition = 0;
        this.finishedLayers = 0;
        // Start looping
        this.asyncInterval = setInterval(
            this.calculate.bind(this),
            0
        );
    }

    public calculate() {
        // this.callCounter++;
        // console.log('called ' + this.callCounter + ' times');
        if (this.finishedLayers === this.layerObjs.length - 1) {
            clearInterval(this.asyncInterval);
            this.updatedHeatmapNormalData.emit(this.heatmapNormalData);
            this.updatedHeatmapNodeData.emit(this.heatmapNodeData);
            return;
        }
        // Check that we still have iterations left, otherwise, return
        // out of function without calling a new one.
        if (this.currentPosition >= this.layerObjs.length - 1) { return; }
        // Do computation
        this.doHeavyLifting(this.layerObjs[this.currentPosition].heatmapNodes, this.layerObjs[this.currentPosition + 1].heatmapNodes);

        // Add to counter
        this.currentPosition++;
    }

    private doHeavyLifting(currLN, nextLN) {
        // repeat connectionCount times -> amount of connections per layer
        for (let j = 0; j < currLN.length; j++) {
            for (let k = 0; k < nextLN.length; k++) {
                try {
                    const weightValue = this.layers[this.currentPosition * 2]['weights'][0]
                    [j / this.networkReductionFactor][k / this.networkReductionFactor];
                    this.createConnectionBetweenCurrLayers(currLN[j], nextLN[k], weightValue);
                } catch (error) {
                    console.error('layers', this.layers);
                    console.error('this.currentPosition', this.currentPosition);
                    console.error('j', j);
                    console.error('k', k);
                    break;
                }

            }
            const percentage = Math.round(j / currLN.length * 100);
            if (percentage % 10 === 0) {
                console.log(percentage + ' % Nodes in current Layer done');
            }
        }
        this.finishedLayers++;
        console.log(this.finishedLayers + '/' + this.layerObjs.length + ' Layers done');
        // console.log(this.finishedLayers);
    }

    // take two points (at random at the moment) from current and the next layer.
    public createConnectionsForLayers(layers, layerObjs, networkReductionFactor) {
        this.layers = layers;
        this.layerObjs = layerObjs;
        this.networkReductionFactor = networkReductionFactor;
        this.startCalculation();
    }

    private createConnectionBetweenCurrLayers(firstNode, secondNode, weightValue) {
        try {
            const heatmapNormalConnections = this.highlightConnection(
                firstNode, secondNode,
                weightValue);
            this.heatmapNormalData = this.heatmapNormalData.concat(heatmapNormalConnections);
            const heatmapNodeConnections = this.highlightNode(
                firstNode, weightValue);
            this.heatmapNodeData = this.heatmapNodeData.concat(heatmapNodeConnections);
        } catch (err) {
            console.log('weightValue', weightValue);
            console.log('err: ', err);
        }
    }

    // private useEpoch(convertedLayerObjs, epochValues) {
    //     // demo data:
    //     epochValues = [];
    //     for (let i = 0; i < this.demoConfig.nodeCount * this.demoConfig.nodeCount * (this.demoConfig.layerCount - 1); i++) {
    //         // code...
    //         epochValues.push(Math.random());
    //     }
    //     // Verbinde kanten mit epochval
    //     // Epochvalues durchgehen und relevante knoten suchen
    //     const epochIdx = 0;
    //     const endIdx = 0;
    //     let alrdyCnt = 0;
    //     for (let i = 0; i < convertedLayerObjs.length; i++) {
    //         /*let curr = layers[i].heatmapNodes;
    //         let next = layers[i+1].heatmapNodes;
    //     epochIdx = endIdx;
    //     endIdx += currLN.length * nextLN.length;
    //     for(epochIdx; epochIdx < endIdx; epochIdx++){
    //         // zb x00,x01,x02,...
    //         epochValues[epochIdx];
    //     }*/
    //         const conn = convertedLayerObjs[i].connections;
    //         if (typeof conn !== 'undefined') {

    //             for (let j = 0; j < conn.length; j++) {
    //                 const combination = conn[j].concat(epochValues[j + alrdyCnt]);
    //                 // let combRealVal = conn[j].concat(layers[i*2]["weights"][0][i][j])
    //                 const heatmapConnections = this.highlightConnection(combination[0], combination[1], combination[2]);
    //                 this.heatmapNormalData = this.heatmapNormalData.concat(heatmapConnections);
    //                 this.updatedHeatmapNormalData.emit(this.heatmapNormalData);
    //             }

    //             alrdyCnt += conn.length;
    //         }
    //     }
    // }

    // take two points and define x points along its line connection
    private highlightConnection(currNode, nextNode, value) {
        // graph function currNode + k* [nextNode[0] - currNode[0], nextNode[1] - currNode[1]]
        // density defines how many heatmappoints/values are set between two nodes
        const tempHeatmapEdges = [];
        // ignore the first and last point because those are in the nodes itself
        for (let i = 1; i < this.density; i++) {
            const tempx = currNode[0] + i / this.density * (nextNode[0] - currNode[0]);
            const tempy = currNode[1] + i / this.density * (nextNode[1] - currNode[1]);
            // value should change here
            tempHeatmapEdges.push([tempx * this.heatmapCanvasResolution, tempy * this.heatmapCanvasResolution, value]);
        }
        return tempHeatmapEdges;
    }

    private highlightNode(currNode, value) {
        const tempHeatmapEdges = [];
        const tempx = currNode[0];
        const tempy = currNode[1];
        tempHeatmapEdges.push([tempx * this.heatmapCanvasResolution, tempy * this.heatmapCanvasResolution, value]);
        return tempHeatmapEdges;
    }

    ngOnDestroy() {
        console.log('ngOnDestroy BrainComponent');
    }
}
