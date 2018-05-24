import { Component, OnInit } from '@angular/core';


@Component({
    selector: 'app-brain',
    templateUrl: './brain.component.html',
    styleUrls: ['./brain.component.scss']
  })
export class BrainComponent implements OnInit {

    ngOnInit() {
        loadTexture();
        loadObject();
    }
    // Recursively traverse through the model.
    // node = modelobject, uvx = uvcoord x, uvy = uvcoord y
    let traversePolygonsForGeometries = function (node, uvx, uvy) {
        console.log("trying to retrieve 3D coords...");
        console.log("node",node);
        //console.dir(node);
        //console.debug(node);
        if (node.geometry) {
        console.log("node.geometry", node.geometry);
            // Return a list of triangles that have the point within them.
            // The returned objects will have the x,y,z barycentric coordinates of the point inside the respective triangle
            let baryData = annotationTest(uvx, uvy, node.geometry.faceVertexUvs);
            if (baryData.length) {
            console.log("barydata is not empty!");
                for (let j = 0; j < baryData.length; j++) {
                console.log("node.geometry.faces[baryData[j][0]]",node.geometry.faces[baryData[j][0]]);
                    // In my case I only want to return materials with certain names.
                    if (node.geometry.faces[baryData[j][0]].daeMaterial === "brainmaterial") {
                        // Find the vertices corresponding to the triangle in the model
                        let vertexa = node.geometry.vertices[node.geometry.faces[baryData[j][0]].a];
                        let vertexb = node.geometry.vertices[node.geometry.faces[baryData[j][0]].b];
                        let vertexc = node.geometry.vertices[node.geometry.faces[baryData[j][0]].c];
                        // Sum the barycentric coordinates and apply to the vertices to get the coordinate in local space
                        let worldX = vertexa.x * baryData[j][1] + vertexb.x * baryData[j][2] + vertexc.x * baryData[j][3];
                        let worldY = vertexa.y * baryData[j][1] + vertexb.y * baryData[j][2] + vertexc.y * baryData[j][3];
                        let worldZ = vertexa.z * baryData[j][1] + vertexb.z * baryData[j][2] + vertexc.z * baryData[j][3];
                        let vector = new THREE.Vector3(worldX, worldY, worldZ);
                        // Translate to world space
                        let worldVector = vector.applyMatrix4(node.matrixWorld);
                        return worldVector;
                    }
                }
            }
        }
        if (node.children) {
            for (let i = 0; i < node.children.length; i++) {
                let worldVectorPoint = traversePolygonsForGeometries(node.children[i], uvx, uvy);
                if (worldVectorPoint) return worldVectorPoint;
            }
        }
    };
        
    // Loops through each face vertex UV item and tests if it is within the triangle.
    private annotationTest(uvX, uvY, faceVertexUletray) {
        console.log("in annotationTest");
        let point = {};
        point["x"] = uvX;
        point["y"] = uvY;
        let results = [];
        console.log("faceVertexUletray",faceVertexUletray);
        for (let i = 0; i < faceVertexUletray[0].length; i++) {
            let result = ptInTriangle(point, faceVertexUletray[0][i][0], faceVertexUletray[0][i][1], faceVertexUletray[0][i][2]);
            if (result.length) {
                results.push([i, result[0], result[1], result[2]]);
            }
        }
        return results;
    };

    // This is a standard barycentric coordinate function.
    private ptInTriangle(p, p0, p1, p2) {
        console.log("in ptInTriangle");
        let x0 = p.x;
        let y0 = p.y;
        let x1 = p0.x;
        let y1 = p0.y;
        let x2 = p1.x;
        let y2 = p1.y;
        let x3 = p2.x;
        let y3 = p2.y;

        let b0 = (x2 - x1) * (y3 - y1) - (x3 - x1) * (y2 - y1)
        let b1 = ((x2 - x0) * (y3 - y0) - (x3 - x0) * (y2 - y0)) / b0
        let b2 = ((x3 - x0) * (y1 - y0) - (x1 - x0) * (y3 - y0)) / b0
        let b3 = ((x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0)) / b0

        if (b1 > 0 && b2 > 0 && b3 > 0) {
            return [b1, b2, b3];
        } else {
            return [];
        }
    };

    private loadTexture() {
        // textureLoader = new THREE.TextureLoader();
        // texture = textureLoader.load('./assets/textures/heatmap3.jpg', render);
        // texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        heatmapCanvasTexture = new THREE.CanvasTexture(document.getElementById("canvHeatmap"), THREE.UVMapping);
        // heatmapCanvasTexture.needsUpdate = true;
        
        brainTexture = new THREE.ImageUtils.loadTexture("/assets/textures/brain_tex.jpg");
        // brainTexture.needsUpdate = true;
        alphaTexture = THREE.ImageUtils.loadTexture("/assets/textures/heatmap_alphamap.jpg");
        // alphaTexture.needsUpdate = true;
        // uniforms
        uniforms = {
            color: { type: "c", value: new THREE.Color(0x0000ff) },
            brainTexture: { type: "t", value: brainTexture },
            heatmapTexture: { type: "t", value: heatmapCanvasTexture },
            alphaTexture: { type: "t", value: alphaTexture }
        };
        
        // attributes
        let attributes = {
        };
        
        // material
        brainMaterial = new THREE.ShaderMaterial({
            attributes: attributes,
            uniforms: uniforms,
            vertexShader: document.getElementById('vertex_shader').textContent,
            fragmentShader: document.getElementById('fragment_shader').textContent
        });
        brainMaterial.name = "brainmaterial";
        
        // draw heatmap
        heat = simpleheat(document.getElementById("canvHeatmap"));
        
        //heatmapMaterial = new THREE.MeshStandardMaterial({
        //  map: heatmapCanvasTexture,
        //  side: THREE.DoubleSide,
        //  alphaTest: 0.5,
        //  alphaMap: THREE.ImageUtils.loadTexture("/assets/textures/heatmap_alphamap.jpg")
        //});
        // https://codepen.io/rauluranga/pen/RNzboz
        // http://adndevblog.typepad.com/cloud_and_mobile/2016/07/projecting-dynamic-textures-onto-flat-surfaces-with-threejs.html
        // https://codepen.io/PierfrancescoSoffritti/pen/wobPVJ
        // https://stackoverflow.com/questions/16287547/multiple-transparent-textures-on-the-same-mesh-face-in-three-js#16897178
        // https://stackoverflow.com/questions/49533486/combine-materials-textures-with-alpha-maps
    }
        
    private loadObject() {
        objectLoader = new THREE.OBJLoader();
        objectLoader.load("./assets/models/obj/Brain_Model_2.obj",
            (obj) => {
            obj.traverse(function(child) {
                if (child instanceof THREE.Mesh) {
                child.material = brainMaterial;
                }
            });
        
            obj.name = "brainobject";
            obj.position.y = -0.5;
            obj.rotation.y = Math.PI / 2;
            scene.add(obj);
            },
            (xhr) => { console.log((xhr.loaded / xhr.total * 100) + '% loaded'); },
            (err) => { console.error('An error happened'); }
        );
    }

    private animate() {
        requestAnimationFrame(animate);
        
        // =======================================================
        // update heatmap
        // =======================================================
        let x, y, val;
        
        if (redraw && typeof convertedLayerObjs != "undefined" && !guiConfig.switchToMoleculeView) {
            // last layer has no connections to "next" layer
            //if (stepperCnt < convertedLayerObjs.length - 1) {
            heat.clear();
            // set radius and blur radius
            heat.radius(heatmapConfig.radius, heatmapConfig.blur);
            heat.gradient(heatmapConfig.colorGradient());
            heat.data(heatmapSteppingData);
            heat.draw(heatmapConfig.minOpacity);
            heatmapCanvasTexture.needsUpdate = true;
        
            redraw = false;
            stepperCnt++;
            //}
        }
        else if (fpsHack >= 60) {
            fpsHack = 0;
            redraw = true;
        }
        fpsHack++;
        // =======================================================
        
        
        // =======================================================
        // render the scene
        // =======================================================
        renderer.render(scene, perspectiveCamera);
        // =======================================================
        
        
        // =======================================================
        // update stats
        // =======================================================
        stats.update();
        // =======================================================
    }
        
    private animateNextStep(layerID) {
        // add heatmapdata from layerID to alrdy existing data
        let connections = convertedLayerObjs[layerID].connections;
        for (let i = 0; i < connections.length; i++) {
            for (let j = 0; j < connections[i].length; j++) {
            heatmapSteppingData.push(connections[i][j]);
            }
        }
    }
        
    private useKerasNetwork(kerasNetwork) {
        console.log("using keras network");
        //let layers = kerasNetwork.getLayers();
        convertedLayerObjs = divideIntoLayerAreas(kerasNetwork, angleSpan);
        
        findFittingVerticesInUVMap(convertedLayerObjs);
        createConnectionsBetweenLayers(convertedLayerObjs);
        }
        
    // cut alphamap area according to neural network properties
    private divideIntoLayerAreas(layersparam, angleSpan) {
        console.log("creating layer areas");
        let layercount = layersparam.length;
        // angle size of the alphamaparea
        let areaPartAngle = angleSpan / layercount;
        let layerObjs = [];
        for (let i = 0; i < layercount; i++) {
            let layerObj = {
            layerID: i,
            size: 1.0 / (layersparam[i].length * 2 + 1), // nodes + free spaces in between + one freespace
            nodeCount: layersparam[i].length,
            layerAngle: 180 - (areaPartAngle * i), // angle of the entire layer
            nodesAngle: 180 - ((areaPartAngle * i) - 0.5 * areaPartAngle) // angle bisector from layerpart
            }
            layerObjs.push(layerObj);
        }
        return layerObjs;
    }
        
    private findFittingVerticesInUVMap(layerObjs) {
        console.log("get center point of each node in layer");
        layerObjs.forEach(layer => {
            // definiere einen kreis mit mittelpunkt des knotens und radius % der gesamtlänge des alphamap zwischenraumes
            let diameterOfNodes = radiusRange * layer.size;
            let radiusOfNodes = diameterOfNodes / 2.0;
            let tempHeatmapNodes = [];
            let layerOffset = calcOffsetBasedOnAngle(layer.nodesAngle);
            for (let i = 1; i <= layer.nodeCount; i++) {
            // radiusInner as minimum offset + nodesizes * i + radius to get to the center of the current node
            let radiusToCenterOfNode = radiusInner + diameterOfNodes * i + radiusOfNodes;
            let randomOffsetX = (Math.random() * 20) - 10;
            let randomOffsetY = (Math.random() * 20) - 10;
            let xCenter = radiusToCenterOfNode * Math.cos(layer.nodesAngle * (Math.PI / 180)) + randomOffsetX;
            let yCenter = radiusToCenterOfNode * Math.sin(layer.nodesAngle * (Math.PI / 180)) + randomOffsetY;
            // add uv centerpoint as offset. y axis is flipped in heatmap
            let heatmapValue = 0.5;
            let centerOfNode = [xCenter + pointcenter[0]-layerOffset, heatmapCanvasHeight - (yCenter + pointcenter[1])];
            // expand around point. this will be the reference to
            tempHeatmapNodes.push(centerOfNode);
            }
            // add nodes converted to heatmap coordinates to each layer
            layer["heatmapNodes"] = tempHeatmapNodes;
        });
    }
        
    // take two points (at random at the moment) from current and the next layer.
    private createConnectionsBetweenLayers(layerObjs) {
        console.log("createConnectionsBetweenLayers");
        //let connectionCheat = 0;
        let demothis = true;
        
        for (let i = 0; i < layerObjs.length - 1; i++) {
            let currLN = layerObjs[i].heatmapNodes;
            let nextLN = layerObjs[i + 1].heatmapNodes;
            let connections = [];
            let edgeCase = false;
            if(edgeCase){
            let temp2D = layers[i*2]["weights"][0];
            let heatmapEdge1 = highlightConnection(currLN[0], nextLN[0], temp2D[0][0]);
            heatmapSteppingData = heatmapSteppingData.concat(heatmapEdge1);
            let heatmapEdge2 = highlightConnection(currLN[currLN.length-1], nextLN[nextLN.length-1], temp2D[temp2D.length-1][temp2D[0].length-1]);
            heatmapSteppingData = heatmapSteppingData.concat(heatmapEdge2);
            //console.log("heatmapSteppingData",heatmapSteppingData);
            }else{
            // repeat connectionCount times -> amount of connections per layer
            for (let j = 0; j < currLN.length; j++) {
                console.log("Progress: "+ (j*100.0/currLN.length) + "%");
                for(let k =0; k< nextLN.length; k++){
                if (demothis){
                    //console.log("highlighting connection and adding it to heatmapdata");
                    try{
                    let heatmapConnections = highlightConnection(currLN[j], nextLN[k], layers[i*2]["weights"][0][j/networkReductionFactor][k/networkReductionFactor])
                    heatmapSteppingData = heatmapSteppingData.concat(heatmapConnections);
                    }catch(err){
                    console.log("i: ",i);
                    console.log("j: ", j);
                    console.log("k: ", k);
                    console.log("layers[i]['weights'][0][j/networkReductionFactor][k/networkReductionFactor]",layers[i]["weights"][0][j/networkReductionFactor][k/networkReductionFactor]);
                    console.log("err: ",err);
                    break;
                    }
                    //connections.push([currLN[j],nextLN[k]]);
                }else{
                    connections.push([currLN[j],nextLN[k]]);
                }
                }
                //let randomNode1 = Math.round(Math.random() * (currLayer.heatmapNodes.length-1));
                //let randomNode2 = Math.round(Math.random() * (nextLayer.heatmapNodes.length - 1));
                //let randomNode1 = i;
                //connectionCheat = randomNode2
                //connections.push([randomNode1, randomNode2]);
                //let coordN1 = currLayer.heatmapNodes[randomNode1];
                //let coordN2 = nextLayer.heatmapNodes[randomNode2];
                //let value = Math.abs(nextLayer.heatmapNodes[randomNode2][2] - currLayer.heatmapNodes[randomNode1][2]);
                //let heatmapValue = currLayer.layerID / layerObjs.length;
                //connections.push(highlightConnection(coordN1, coordN2, heatmapValue));
            }
            }
            //console.log("connections",connections);
            layerObjs[i]["connections"] = connections;
        }
    }
        
    private useEpoch(epochValues){
        //demo data:
        epochValues = [];
        for (let i = 0; i < demoConfig.nodeCount*demoConfig.nodeCount * (demoConfig.layerCount-1); i++) {
            // code...
            epochValues.push(Math.random());
        }
        // Verbinde kanten mit epochval
        // Epochvalues durchgehen und relevante knoten suchen
        let epochIdx = 0;
        let endIdx = 0;
        let alrdyCnt = 0
        for(let i = 0; i < convertedLayerObjs.length; i++){
            /*let curr = layers[i].heatmapNodes;
            let next = layers[i+1].heatmapNodes;
        epochIdx = endIdx;
        endIdx += currLN.length * nextLN.length;
        for(epochIdx; epochIdx < endIdx; epochIdx++){
            // zb x00,x01,x02,...
            epochValues[epochIdx];
        }*/
            let conn = convertedLayerObjs[i].connections;
            if(typeof conn != 'undefined'){
            
                for(let j = 0; j< conn.length; j++){
                let combination = conn[j].concat(epochValues[j+alrdyCnt]);
                //let combRealVal = conn[j].concat(layers[i*2]["weights"][0][i][j])
                let heatmapConnections = highlightConnection(combination[0],combination[1],combination[2]);
                heatmapSteppingData = heatmapSteppingData.concat(heatmapConnections);
                }
            
                alrdyCnt += conn.length;
            }
        }
    }
        
        /*function applyWeights(){
        for(let i = 0; i < convertedLayerObjs.length; i++){
            let conn = convertedLayerObjs[i].connections;
            if(typeof conn != 'undefined'){
            }
        }
        }*/
        
    // take two points and define x points along its line connection
    private highlightConnection(currNode, nextNode, value) {
        // graph function currNode + k* [nextNode[0] - currNode[0], nextNode[1] - currNode[1]]
        // density defines how many heatmappoints/values are set between two nodes
        let tempHeatmapEdges = [];
        // ignore the first and last point because those are in the nodes itself
        for (let i = 1; i < density; i++) {
            let tempx = currNode[0] + i / density * (nextNode[0] - currNode[0]);
            let tempy = currNode[1] + i / density * (nextNode[1] - currNode[1]);
            // value should change here
            tempHeatmapEdges.push([tempx * heatmapCanvasResolution, tempy * heatmapCanvasResolution, value]);
        }
        return tempHeatmapEdges;
    }
        
    private calcOffsetBasedOnAngle(angle:Number){
        //console.log("angle",angle);
        let offset = 0;
        if(angle > 170){
            offset = 20;
        }else{
            offset = 0;
        }
        return offset;
    }

}