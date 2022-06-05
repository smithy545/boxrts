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

import { Camera } from "./Camera.js";


declare var window: any;

class CameraController {
    camera: Camera;
    fullscreen: boolean;

    constructor(camera: Camera, canvas: HTMLCanvasElement) {
        this.camera = camera;
        this.fullscreen = false;

        document.addEventListener("fullscreenchange", (ev) => {
            if(this.fullscreen) {
                console.log("Exiting fullscreen.");
                document.exitPointerLock();
            } else {
                console.log("Entering fullscreen.");
                canvas.requestPointerLock();
            }
            this.fullscreen = !this.fullscreen;
        }, false);
        document.addEventListener('fullscreenerror', (ev) => {
            console.error("Cannot change fullscreen status.");
        }, false);

        canvas.onmousemove = (ev: MouseEvent) => {
            let dx = ev.movementX * 45 * Math.PI / (180 * canvas.height);
            let point = window.vec3.create();
            for(let i = 0; i < point.length; ++i)
                point[i] += this.camera.position[i] + this.camera.forward[i];
            window.vec3.rotateY(point, point, this.camera.position, dx);
            this.camera.lookAt(point);
        };
        canvas.onmousedown = (ev: MouseEvent) => {
            canvas.requestFullscreen();
        }
    }
};

export { CameraController };