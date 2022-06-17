/*
MIT License

Copyright (c) 2022 Philip Arturo Smith

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

import { MeshController } from "./render/MeshController.js";
import { InstancedObject } from "./render/InstancedObject.js";
import { Renderer } from "./render/Renderer.js";


declare var window: any;

class Scene {
    instancedFloor: InstancedObject;
    playerController: MeshController;

    constructor() {}

    setup(renderer: Renderer) {
        // floor verts/colors/indices
        const positions = [
            0, 0, 0, 1,
            0, 0, 1, 1,
            1, 0, 0, 1,
            1, 0, 1, 1
        ];
        const normals = [
            0, 0, 0,
            0, 0, 1,
            1, 0, 0,
            1, 0, 1
        ];
        let width = 1760.;
        let height = 704.;
        let tw = 64.;
        let th = 64.;
        let margin = 32;
        let nw = 18;
        let n = 0;
        let ix = (margin + (tw + margin) * (n % nw) ) / width;
        let iy = (margin + (th + margin) * Math.floor(n / nw)) / height;
        let iw = tw / width;
        let ih = th / height;
        const uvs = [
            ix, iy,
            ix, iy + ih,
            ix + iw, iy,
            ix + iw, iy + ih
        ];
        const indices = [0, 1, 2, 3, 2, 1];
        this.instancedFloor = renderer.createTexturedTriangleMesh(positions, uvs, normals, indices);
        this.instancedFloor.addTexture("medieval_tilesheet");

        const playerMesh = renderer.getMesh("basicCharacter");
        this.playerController = new MeshController(renderer.gl, playerMesh);

        const N = 20;
        const transform = window.mat4.create();
        const scaledBase = window.mat4.create();
        window.mat4.scale(scaledBase, scaledBase, [8, 8, 8]);
        const pos = window.vec3.fromValues(0, 0, 0);
        for(let i = 0; i < N*N; ++i) {
            pos[0] = i % N;
            pos[2] = Math.floor(i/N);
            this.instancedFloor.addInstance(
                renderer.gl,
                window.mat4.translate(
                    transform,
                    scaledBase,
                    pos
                )
            );
            pos[0] = -2*pos[0];
            pos[2] = 0;
            this.instancedFloor.addInstance(
                renderer.gl,
                window.mat4.translate(
                    transform,
                    transform,
                    pos
                )
            );
            pos[0] = 0;
            pos[2] = -2*Math.floor(i/N);
            this.instancedFloor.addInstance(
                renderer.gl,
                window.mat4.translate(
                    transform,
                    transform,
                    pos
                )
            );
            pos[0] = 2*(i % N);
            pos[2] = 0;
            this.instancedFloor.addInstance(
                renderer.gl,
                window.mat4.translate(
                    transform,
                    transform,
                    pos
                )
            );
        }
    }

};

export { Scene };