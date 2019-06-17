// import * as THREE from 'three';

// import "three/examples/js/loaders/OBJLoader2.js";
// import "three/examples/js/loaders/LoaderSupport.js";

// export class threeDObject {

//     private _scene: THREE.Scene;
//     public get scene(): THREE.Scene {
//         return this._scene;
//     }

//     private _renderer: THREE.WebGLRenderer;
//     public get renderer(): THREE.WebGLRenderer {
//         return this._renderer;
//     }

//     constructor() {

//     }

//     private loadObject() {
//         const objLoader = new THREE.OBJLoader2();
//         objLoader.load('/assets/models/obj/Brain_Model_2.obj', (event) => {
//             const root = event.detail.loaderRootNode;
//             this._scene.add(root);
//         });
//     }
// }