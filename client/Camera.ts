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
    view: Float32Array;
    position: Float32Array;
    forward: Float32Array;
    up: Float32Array;

    constructor(position: Float32Array, forward: Float32Array, up: Float32Array) {
        this.view = window.mat4.create();
        this.position = position;
        this.forward = window.vec3.create();
        window.vec3.normalize(this.forward, forward);
        this.up = window.vec3.create();
        window.vec3.normalize(this.up, up);
        this.resetView();
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
        this.resetView();
    }

    setForward(direction: Float32Array) {
        window.vec3.normalize(this.forward, direction);
        this.resetView();
    }

    setPosition(position: Float32Array) {
        this.position = position;
        this.resetView();
    }

    moveForward(scale: number = 1) {
        this.position[0] += scale * this.forward[0];
        this.position[1] += scale * this.forward[1];
        this.position[2] += scale * this.forward[2];
        this.resetView();
    }

    moveUp(scale: number = 1) {
        this.position[0] += scale * this.up[0];
        this.position[1] += scale * this.up[1];
        this.position[2] += scale * this.up[2];
        this.resetView();
    }

    moveRight(scale: number = 1) {
        const right = window.vec3.create();
        window.vec3.cross(right, this.forward, this.up);
        this.position[0] += scale * right[0];
        this.position[1] += scale * right[1];
        this.position[2] += scale * right[2];
        this.resetView();
    }

    moveFlat(dx: number, dz: number) {
        const forward = window.vec3.clone(this.forward);
        forward[1] = 0; // TODO: Stop using +y as de facto up vector
        const right = window.vec3.create();
        right[1] = 0; // TODO: Stop using +y as de facto up vector
        window.vec3.cross(right, this.forward, this.up);
        window.vec3.scaleAndAdd(this.position, this.position, forward, dx);
        window.vec3.scaleAndAdd(this.position, this.position, right, dz);
        this.resetView();
        // TODO: Make generic moveAlongPlane method by subtracting projection of forward vector
        // along surface normal and normalizing creating an "in-plane" forward vector
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
        this.resetView();
    }

    resetView() {
        window.mat4.translate(this.view, window.mat4.create(), this.position);    
        window.mat4.lookAt(this.view, this.position, [
            this.position[0] + this.forward[0],
            this.position[1] + this.forward[1],
            this.position[2] + this.forward[2]
        ], this.up);
    }
};

export { Camera };