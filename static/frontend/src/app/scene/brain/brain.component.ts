import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';

import * as THREE from 'three';
import 'three/examples/js/loaders/OBJLoader.js';
// import 'three/examples/js/controls/OrbitControls.js';


@Component({
    selector: 'app-brain',
    templateUrl: './brain.component.html',
    styleUrls: ['./brain.component.scss']
})
export class BrainComponent implements OnInit, OnDestroy {
    private traversePolygonsForGeometries;
    private scene: THREE.Scene;
    private objectLoader;
    @Output() updatedHeatmapCanvasTexture = new EventEmitter<THREE.CanvasTexture>();
    private heatmapSteppingData = [];
    @Output() updatedHeatmapData = new EventEmitter<any>();
    // amount (-1) of points that should be drawn per connection / between nodes
    private density = 5; // -> 4 points

    private heatmapCanvasResolution = 1.0; // 8.0;

    private brainMaterial;
    private uniforms;
    // gui configs

    htmlCanvas: any;
    public get getHeatmapCanvas(): string {
        return this.htmlCanvas;
    }


    private demoConfig = {
        layerCount: 2,
        nodeCount: 3,
        activateEdgeCase: false
    };
    greyscaleTexture: THREE.Texture;

    ngOnInit() {
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
        // textureLoader = new THREE.TextureLoader();
        // texture = textureLoader.load('./assets/textures/heatmap3.jpg', render);
        // texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        this.htmlCanvas = document.getElementById('canvHeatmap');
        // console.log(this.htmlCanvas);
        const heatmapCanvasTexture = new THREE.CanvasTexture(this.htmlCanvas, THREE.UVMapping);
        // this.heatmapCanvasTexture.needsUpdate = true;
        this.updatedHeatmapCanvasTexture.emit(heatmapCanvasTexture);
        const brainTexture = new THREE.TextureLoader().load('/assets/textures/brain_tex_grey.jpg');
        const greyscaleTexture = new THREE.TextureLoader().load('/assets/textures/brain_tex_greyscale.jpg');
        // brainTexture.needsUpdate = true;
        const alphaTexture = new THREE.TextureLoader().load('/assets/textures/heatmap_alphamap.jpg');
        // alphaTexture.needsUpdate = true;
        // uniforms
        this.uniforms = {
            color: { type: 'c', value: new THREE.Color(0x000000) },
            brainTexture: { type: 't', value: greyscaleTexture },
            heatmapTexture: { type: 't', value: heatmapCanvasTexture },
            alphaTexture: { type: 't', value: alphaTexture },
            scale: { type: 'v3', value: new THREE.Vector3() }
        };

        // attributes
        const attributes = {
        };


        // const spriteMaterial = new THREE.SpriteMaterial( { map: spriteTexture } );
        // this.grayscaleMaterial = new THREE.ShaderMaterial({
        //     // attributes: attributes,
        //     uniforms: this.uniforms,
        //     vertexShader: document.getElementById('vertex_shader').textContent,
        //     fragmentShader: document.getElementById('fragment_shader').textContent
        // });
        // const grayscaleObj = new THREE.Sprite( spriteMaterial );
        // sprite.scale.set(2, 2, 1);

        // this.scene.add(sprite);

        // material
        this.brainMaterial = new THREE.ShaderMaterial({
            // attributes: attributes,
            uniforms: this.uniforms,
            vertexShader: document.getElementById('vertex_shader').textContent,
            fragmentShader: document.getElementById('fragment_shader').textContent
        });
        this.brainMaterial.name = 'brainmaterial';

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
        const plane2DMesh = new THREE.Mesh(plane2DGeo, this.brainMaterial);
        plane2DMesh.name = 'planeMesh';
        plane2DMesh.visible = false;
        this.scene.add(plane2DMesh);
    }

    private animateNextStep(convertedLayerObjs, layerID) {
        // add heatmapdata from layerID to alrdy existing data
        const connections = convertedLayerObjs[layerID].connections;
        for (let i = 0; i < connections.length; i++) {
            for (let j = 0; j < connections[i].length; j++) {
                this.heatmapSteppingData.push(connections[i][j]);
            }
        }
    }

    // take two points (at random at the moment) from current and the next layer.
    public createConnectionsBetweenLayers(layers, layerObjs, networkReductionFactor) {
        // console.log('createConnectionsBetweenLayers');
        // let connectionCheat = 0;
        const demothis = true;

        for (let i = 0; i < layerObjs.length - 1; i++) {
            const currLN = layerObjs[i].heatmapNodes;
            const nextLN = layerObjs[i + 1].heatmapNodes;
            const connections = [];
            const edgeCase = false;
            if (edgeCase) {
                const temp2D = layers[i * 2]['weights'][0];
                const heatmapEdge1 = this.highlightConnection(currLN[0], nextLN[0], temp2D[0][0]);
                this.heatmapSteppingData = this.heatmapSteppingData.concat(heatmapEdge1);
                const heatmapEdge2 = this.highlightConnection(
                    currLN[currLN.length - 1], nextLN[nextLN.length - 1],
                    temp2D[temp2D.length - 1][temp2D[0].length - 1]);
                this.heatmapSteppingData = this.heatmapSteppingData.concat(heatmapEdge2);
                this.updatedHeatmapData.emit(this.heatmapSteppingData);
                // console.log("heatmapSteppingData",heatmapSteppingData);
            } else {
                // repeat connectionCount times -> amount of connections per layer
                for (let j = 0; j < currLN.length; j++) {
                    console.log('Progress: ' + (j * 100.0 / currLN.length) + '%');
                    for (let k = 0; k < nextLN.length; k++) {
                        if (demothis) {
                            // console.log("highlighting connection and adding it to heatmapdata");
                            try {
                                const heatmapConnections = this.highlightConnection(
                                    currLN[j], nextLN[k],
                                    layers[i * 2]['weights'][0][j / networkReductionFactor][k / networkReductionFactor]);
                                this.heatmapSteppingData = this.heatmapSteppingData.concat(heatmapConnections);
                                this.updatedHeatmapData.emit(this.heatmapSteppingData);
                            } catch (err) {
                                console.log('i: ', i);
                                console.log('j: ', j);
                                console.log('k: ', k);
                                console.log('layers[i][\'weights\'][0][j/networkReductionFactor][k/networkReductionFactor]',
                                    layers[i]['weights'][0][j / networkReductionFactor][k / networkReductionFactor]);
                                console.log('err: ', err);
                                break;
                            }
                            // connections.push([currLN[j],nextLN[k]]);
                        } else {
                            connections.push([currLN[j], nextLN[k]]);
                        }
                    }
                    // let randomNode1 = Math.round(Math.random() * (currLayer.heatmapNodes.length-1));
                    // let randomNode2 = Math.round(Math.random() * (nextLayer.heatmapNodes.length - 1));
                    // let randomNode1 = i;
                    // connectionCheat = randomNode2
                    // connections.push([randomNode1, randomNode2]);
                    // let coordN1 = currLayer.heatmapNodes[randomNode1];
                    // let coordN2 = nextLayer.heatmapNodes[randomNode2];
                    // let value = Math.abs(nextLayer.heatmapNodes[randomNode2][2] - currLayer.heatmapNodes[randomNode1][2]);
                    // let heatmapValue = currLayer.layerID / layerObjs.length;
                    // connections.push(highlightConnection(coordN1, coordN2, heatmapValue));
                }
            }
            // console.log("connections",connections);
            layerObjs[i]['connections'] = connections;
        }
    }

    private useEpoch(convertedLayerObjs, epochValues) {
        // demo data:
        epochValues = [];
        for (let i = 0; i < this.demoConfig.nodeCount * this.demoConfig.nodeCount * (this.demoConfig.layerCount - 1); i++) {
            // code...
            epochValues.push(Math.random());
        }
        // Verbinde kanten mit epochval
        // Epochvalues durchgehen und relevante knoten suchen
        const epochIdx = 0;
        const endIdx = 0;
        let alrdyCnt = 0;
        for (let i = 0; i < convertedLayerObjs.length; i++) {
            /*let curr = layers[i].heatmapNodes;
            let next = layers[i+1].heatmapNodes;
        epochIdx = endIdx;
        endIdx += currLN.length * nextLN.length;
        for(epochIdx; epochIdx < endIdx; epochIdx++){
            // zb x00,x01,x02,...
            epochValues[epochIdx];
        }*/
            const conn = convertedLayerObjs[i].connections;
            if (typeof conn !== 'undefined') {

                for (let j = 0; j < conn.length; j++) {
                    const combination = conn[j].concat(epochValues[j + alrdyCnt]);
                    // let combRealVal = conn[j].concat(layers[i*2]["weights"][0][i][j])
                    const heatmapConnections = this.highlightConnection(combination[0], combination[1], combination[2]);
                    this.heatmapSteppingData = this.heatmapSteppingData.concat(heatmapConnections);
                    this.updatedHeatmapData.emit(this.heatmapSteppingData);
                }

                alrdyCnt += conn.length;
            }
        }
    }

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

    ngOnDestroy() {
        console.log('ngOnDestroy BrainComponent');
    }
}
