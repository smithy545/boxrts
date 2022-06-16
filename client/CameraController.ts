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
import { FullscreenController, KeyInputController, MouseInputController } from "./InputControllers.js";
import { KeyInputMixin, KeyInputState } from "./mixins/KeyInputMixin.js";


class CameraControllerBase implements MouseInputController, KeyInputController, KeyInputState, FullscreenController {
    camera: Camera;
    canvas: HTMLCanvasElement;
    focused: boolean;
    fullscreen: boolean;

    // satisfy controller interface reqs, undefined atm
    mouseUpCallback?: (ev: MouseEvent) => void;
    mouseEnterCallback?: (ev: MouseEvent) => void;
    mouseLeaveCallback?: (ev: MouseEvent) => void;

    // defined by KeyInputMixin
    keyUpCallback?: (ev: KeyboardEvent) => void;
    keyDownCallback?: (ev: KeyboardEvent) => void;
    getKey: (key: string) => boolean;

    constructor(camera: Camera, canvas: HTMLCanvasElement) {
        this.camera = camera;
        this.canvas = canvas;
        this.fullscreen = false;
        document.addEventListener("fullscreenchange", this.fullscreenChangeCallback.bind(this), false);
        document.addEventListener("fullscreenerror", this.fullscreenErrorCallback.bind(this), false);
        canvas.addEventListener("mousemove", this.mouseMoveCallback.bind(this), false);
        canvas.addEventListener("mousedown", this.mouseDownCallback.bind(this), false);
        canvas.addEventListener("wheel", this.mouseWheelCallback.bind(this), false);
        document.addEventListener("keydown", this.keyDownCallback.bind(this), false);
        document.addEventListener("keyup", this.keyUpCallback.bind(this), false);
    }

    fullscreenChangeCallback(ev: Event) {
        if(this.fullscreen) {
            console.info("Exiting fullscreen.");
            document.exitPointerLock();
        } else {
            console.info("Entering fullscreen.");
            this.canvas.requestPointerLock();
        }
        this.fullscreen = !this.fullscreen;
    }

    fullscreenErrorCallback(ev: Event) {
        console.error("Cannot change fullscreen status.");
    }

    mouseWheelCallback(ev: WheelEvent) {
        if(!this.fullscreen)
            return;
        this.camera.moveForward(-ev.deltaY/100.0);
    }

    mouseMoveCallback(ev: MouseEvent) {
        if(!this.fullscreen)
            return;
        this.camera.lookAtMouse(ev.movementX, ev.movementY, this.canvas);
    }

    mouseDownCallback(ev: MouseEvent) {
        if(!this.fullscreen)
            this.canvas.requestFullscreen();
    }

    tick() {
        if(this.getKey('w'))
            this.camera.moveFlat(1,0);
        if(this.getKey('a'))
            this.camera.moveFlat(0,-1);
        if(this.getKey('s'))
            this.camera.moveFlat(-1,0);
        if(this.getKey('d'))
            this.camera.moveFlat(0,1);
        if(this.getKey(' '))
            this.camera.moveUp();
        if(this.getKey('shift') && this.camera.position[1] >= 2)
            this.camera.moveUp(-1);
    }
};

const CameraController = KeyInputMixin(CameraControllerBase);

export { CameraController };