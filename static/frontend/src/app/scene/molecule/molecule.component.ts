import { Component, OnInit } from '@angular/core';

import * as THREE from 'three';
import 'three/examples/js/loaders/OBJLoader.js';
import 'three/examples/js/controls/OrbitControls.js';
import 'three/examples/js/loaders/PDBLoader.js';
import 'three/examples/js/renderers/CSS3DRenderer.js';
import 'three/examples/js/controls/TrackballControls.js';

@Component({
    selector: 'app-molecule',
    templateUrl: './molecule.component.html',
    styleUrls: ['./molecule.component.scss']
})
export class MoleculeComponent implements OnInit {

    private scene: THREE.Scene;
    private root;

    private objects = [];
    private tmpVec1 = new THREE.Vector3();
    private tmpVec2 = new THREE.Vector3();
    private tmpVec3 = new THREE.Vector3();
    private tmpVec4 = new THREE.Vector3();
    private offset = new THREE.Vector3();

    private colorSpriteMap = {};
    private baseSprite = document.createElement('img');

    private myAtomLayers = [];

    ngOnInit() {

    }

    setupMolecule(atomObj) {
        this.myAtomLayers = atomObj;
        console.log('atomlayers', this.myAtomLayers);


        // camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 1, 5000 );
        // camera.position.z = 1500;

        this.scene = new THREE.Scene();

        this.root = new THREE.Object3D();
        this.scene.add(this.root);

        //

        /*renderer = new THREE.CSS3DRenderer();
        renderer.setSize( window.innerWidth, window.innerHeight );
        document.getElementById( 'container' ).appendChild( renderer.domElement );*/

        //

        /*controls = new THREE.TrackballControls( camera, renderer.domElement );
        controls.rotateSpeed = 0.5;
        controls.addEventListener( 'change', render );*/

        //

        this.baseSprite.onload = () => {
            console.log('basesprite loaded, calling initMyAtom()');
            this.initMyAtom();
        };

        this.baseSprite.src = '../assets/models/molecules/ball.png';

        return this.scene;

    }

    private showAtomsBonds() {

        for (let i = 0; i < this.objects.length; i++) {

            const object = this.objects[i];

            object.element.style.display = '';
            object.visible = true;

            if (!(object instanceof THREE.CSS3DSprite)) {

                object.element.style.height = object.userData.bondLengthShort;

            }

        }
        console.log('finished showing as atoms+bonds');

    }

    //

    private colorify(ctx, width, height, color) {

        const r = color.r, g = color.g, b = color.b;

        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        for (let i = 0, l = data.length; i < l; i += 4) {

            data[i + 0] *= r;
            data[i + 1] *= g;
            data[i + 2] *= b;

        }

        ctx.putImageData(imageData, 0, 0);

    }

    private imageToCanvas(image) {

        const width = image.width;
        const height = image.height;

        const canvas = document.createElement('canvas');

        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext('2d');
        context.drawImage(image, 0, 0, width, height);

        return canvas;

    }

    private loadMoleculesOld(sceneparam, rendererparam, layers) {
        this.scene = sceneparam;
        console.log('loading Molecules');
        // https://answers.unity.com/questions/374778/how-to-convert-pixeluv-coordinates-to-world-space.html
        // https://answers.unity.com/questions/372047/find-world-position-of-a-texture2d.html
        for (let i = 0; i < layers.length; i += 2) {
            const tempLayerObj = {
                atoms: [],
                bonds: []
            };
            for (let j = 0; j < layers[i]['weights'][0].length; j += 10) {
                const tempAtom = {
                    x: i * 10,
                    y: j,
                    z: 0
                };
                tempLayerObj.atoms.push(tempAtom);
                for (let k = 0; k < layers[i]['weights'][0][0].length; k += 10) {
                    const tempBond = {
                        source: j,
                        target: k
                    };
                    tempLayerObj.bonds.push(tempBond);
                }
            }
            this.myAtomLayers.push(tempLayerObj);
        }

        // this.setupMolecule();
    }

    private loadMolecules(atomObj) {
        console.log('received atomObj: ', atomObj);
        this.myAtomLayers = atomObj;

        // this.setupMolecule();
    }

    private initMyAtom() {

        for (let i = 0; i < this.objects.length; i++) {

            const object = this.objects[i];
            object.parent.remove(object);

        }

        this.objects = [];

        for (let i = 0; i < this.myAtomLayers.length; ++i) {

            const positionsAtom = this.myAtomLayers[i].atoms;
            console.log('positionsAtom', positionsAtom);

            const position = new THREE.Vector3();
            const color = new THREE.Color();


            for (let k = 0; k < positionsAtom.length; k++) {

                position.x = positionsAtom[k].x;
                position.y = positionsAtom[k].y;
                position.z = positionsAtom[k].z;

                color.r = 255 / 255.0;
                color.g = 87 / 255.0;
                color.b = 51 / 255.0;
                // 48, 80, 248

                // let atom = json.atoms[ i ];
                // let element = atom[ 4 ];
                const element = 'default';

                if (!this.colorSpriteMap[element]) {

                    const canvas = this.imageToCanvas(this.baseSprite);
                    const context = canvas.getContext('2d');

                    this.colorify(context, canvas.width, canvas.height, color);

                    const dataUrl = canvas.toDataURL();

                    this.colorSpriteMap[element] = dataUrl;

                }

                const colorSprite = this.colorSpriteMap[element];

                // console.log("creating atomimg with colorsprite");
                const atomImg = document.createElement('img');
                atomImg.src = colorSprite;

                const object = new THREE.CSS3DSprite(atomImg);
                object.position.copy(position);
                object.position.multiplyScalar(75);

                object.matrixAutoUpdate = false;
                object.updateMatrix();

                // console.log('adding css3dsprite to root: ', this.root);
                this.root.add(object);

                this.objects.push(object);

            }
            // console.log("finished atoms");

            const positionsBonds = this.myAtomLayers[i].bonds;

            const start = new THREE.Vector3();
            const end = new THREE.Vector3();

            for (let k = 0; k < positionsBonds.length; k++) {
                /*console.log("positionsBonds[i].source",positionsBonds[i].source);
                console.log("positionsBonds[i].target",positionsBonds[i].target);
                console.log("positionsAtom",positionsAtom);*/

                start.x = positionsAtom[positionsBonds[k].source].x;
                start.y = positionsAtom[positionsBonds[k].source].y;
                start.z = positionsAtom[positionsBonds[k].source].z;

                end.x = this.myAtomLayers[i + 1].atoms[positionsBonds[k].target].x;
                end.y = this.myAtomLayers[i + 1].atoms[positionsBonds[k].target].y;
                end.z = this.myAtomLayers[i + 1].atoms[positionsBonds[k].target].z;

                start.multiplyScalar(75);
                end.multiplyScalar(75);

                this.tmpVec1.subVectors(end, start);
                const bondLength = this.tmpVec1.length() - 50;

                //

                const bond = document.createElement('div');
                bond.className = 'bond';
                bond.style.height = bondLength + 'px';

                const object2 = new THREE.CSS3DObject(bond);
                object2.position.copy(start);
                object2.position.lerp(end, 0.5);

                object2.userData.bondLengthShort = bondLength + 'px';
                object2.userData.bondLengthFull = (bondLength + 55) + 'px';

                //

                const axis = this.tmpVec2.set(0, 1, 0).cross(this.tmpVec1);
                const radians = Math.acos(this.tmpVec3.set(0, 1, 0).dot(this.tmpVec4.copy(this.tmpVec1).normalize()));

                const objMatrix = new THREE.Matrix4().makeRotationAxis(axis.normalize(), radians);
                object2.matrix = objMatrix;
                object2.rotation.setFromRotationMatrix(object2.matrix, object2.rotation.order);

                object2.matrixAutoUpdate = false;
                object2.updateMatrix();

                this.root.add(object2);

                this.objects.push(object2);

                //

                const bond2 = document.createElement('div');
                bond2.className = 'bond';
                bond2.style.height = bondLength + 'px';

                // old:
                // const joint = new THREE.Object3D( bond2 );
                // new:
                const joint = new THREE.Object3D();
                joint.position.copy(start);
                joint.position.lerp(end, 0.5);

                joint.matrix.copy(objMatrix);
                joint.rotation.setFromRotationMatrix(joint.matrix, joint.rotation.order);

                joint.matrixAutoUpdate = false;
                joint.updateMatrix();

                const object3 = new THREE.CSS3DObject(bond2);
                object3.rotation.y = Math.PI / 2;

                object3.matrixAutoUpdate = false;
                object3.updateMatrix();

                object3.userData.bondLengthShort = bondLength + 'px';
                object3.userData.bondLengthFull = (bondLength + 55) + 'px';

                object3.userData.joint = joint;

                joint.add(object3);
                this.root.add(joint);

                this.objects.push(object3);

            }
            // console.log("finished bonds");
        }

        console.log('finished atoms and bonds');

        // console.log( "CSS3DObjects:", objects.length );
        this.showAtomsBonds();

    }

}
