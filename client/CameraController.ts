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


class CameraController {
    camera: Camera;
    fullscreen: boolean;
    keys: {[key: string]: boolean};

    constructor(camera: Camera, canvas: HTMLCanvasElement) {
        this.camera = camera;
        this.fullscreen = false;
        this.keys = {};

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
        document.addEventListener("fullscreenerror", (ev) => {
            console.error("Cannot change fullscreen status.");
        }, false);

        canvas.onmousemove = (ev: MouseEvent) => {
            if(!this.fullscreen)
                return;
            this.camera.lookAtMouse(ev.movementX, ev.movementY, canvas);
        };
        canvas.onmousedown = (ev: MouseEvent) => {
            if(!this.fullscreen)
                canvas.requestFullscreen();
        };
        document.onkeydown = (ev: KeyboardEvent) => {
            if(ev.shiftKey)
                this.keys['shift'] = true;
            if(ev.ctrlKey)
                this.keys['ctrl'] = true;
            this.keys[ev.key] = true;
        };
        document.onkeyup = (ev: KeyboardEvent) => {
            if(!ev.shiftKey)
                this.keys['shift'] = false;
            if(!ev.ctrlKey)
                this.keys['ctrl'] = false;
            this.keys[ev.key] = false;
        };
    }

    tick() {
        if(this.keys['w'])
            this.camera.moveFlat(1,0);
        if(this.keys['a'])
            this.camera.moveFlat(0,-1);
        if(this.keys['s'])
            this.camera.moveFlat(-1,0);
        if(this.keys['d'])
            this.camera.moveFlat(0,1);
        if(this.keys[' '])
            this.camera.moveUp();
        if(this.keys['shift'] && this.camera.position[1] >= 2)
            this.camera.moveUp(-1);
    }
};

export { CameraController };