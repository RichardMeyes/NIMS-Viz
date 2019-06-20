import {ElementRef} from '@angular/core';
import * as THREE from 'three-full';

export class threeDObject {

    private _scene: THREE.Scene;
    public get scene(): THREE.Scene {
        return this._scene;
    }

    private _renderer: THREE.WebGLRenderer;
    public get renderer(): THREE.WebGLRenderer {
        return this._renderer;
    }

    /**
     * Creates a 3D-Object from a given source. 
     * @param _modelPath Path from a .obj file which the 3D-Object should be created from.
     */
    constructor(
        private _modelPath: string,
        private _canvas: ElementRef) {
            // creats the renderer first

            this._scene = new THREE.Scene();
    }

    private loadObject() {
        const objLoader = new THREE.OBJLoader2();
        objLoader.load(this._modelPath, (event) => {
            const root = event.detail.loaderRootNode;
            this._scene.add(root);
        });
    }
}