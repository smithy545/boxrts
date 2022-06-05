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


declare var window: any;

class Camera {
    position: Float32Array;
    forward: Float32Array;
    up: Float32Array;
    changed: boolean;

    constructor(position: Float32Array, forward: Float32Array, up: Float32Array) {
        this.position = position;
        this.forward = window.vec3.create();
        window.vec3.normalize(this.forward, forward);
        this.up = window.vec3.create();
        window.vec3.normalize(this.up, up);
        this.changed = true;
    }

    lookAt(center: Float32Array) {
        let invSize = 0;
        for(let i = 0; i < this.forward.length; ++i) {
            this.forward[i] = center[i] - this.position[i];
            invSize += this.forward[i] * this.forward[i];
        }
        invSize = 1.0 / Math.sqrt(invSize);
        for(let i = 0; i < this.forward.length; ++i)
            this.forward[i] *= invSize;
        this.changed = true;
    }

    setForward(direction: Float32Array) {
        window.vec3.normalize(this.forward, direction);
        this.changed = true;
    }

    setPosition(position: Float32Array) {
        this.position = position;
        this.changed = true;
    }

    move(translation: Float32Array) {
        this.position[0] += translation[0];
        this.position[1] += translation[1];
        this.position[2] += translation[2];
        this.changed = true;
    }

    lookAtMouse(dx: number, dy: number, canvas: HTMLCanvasElement) {
        let view = window.mat4.create();
        window.mat4.rotate(view, view, -2 * Math.PI * dx / canvas.width, this.up);
        let temp = window.vec3.create(); // use as "right" directional vector
        let forward = window.vec3.clone(this.forward);
        window.vec3.cross(temp, forward, this.up);
        window.mat4.rotate(view, view, -2 * Math.PI * dy / canvas.height, temp);
        window.vec3.transformMat4(forward, forward, view);

        // use temp to check forward x up collinearity 
        window.vec3.cross(temp, forward, this.up);
        const epsilon = 0.001;
        if(window.vec3.length(temp) > epsilon)
            this.setForward(forward);
    }
};

export { Camera };