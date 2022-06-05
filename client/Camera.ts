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


class Camera {
    position: number[];
    forward: number[];
    up: number[];
    changed: boolean;

    constructor(position: number[] = [0, 0, 0], forward: number[] = [1, 0, 0], up: number[] = [0, 1, 0]) {
        this.position = position;
        this.forward = forward;
        this.up = up;
        this.changed = true;
    }

    lookAt(center: number[]) {
        let inv_size = 0;
        for(let i = 0; i < this.forward.length; ++i) {
            this.forward[i] = center[i] - this.position[i];
            inv_size += this.forward[i] * this.forward[i];
        }
        inv_size = 1.0 / Math.sqrt(inv_size);
        for(let i = 0; i < this.forward.length; ++i)
            this.forward[i] *= inv_size;
        this.changed = true;
    }

    lookTowards(direction: number[]) {
        this.forward = direction;
        this.changed = true;
    }

    setPosition(position: number[]) {
        this.position = position;
        this.changed = true;
    }

    move(translation: number[]) {
        this.position[0] += translation[0];
        this.position[1] += translation[1];
        this.position[2] += translation[2];
        this.changed = true;
    }

    turn(radians: number) {
        // TODO: Import vec3 glMatrix lib?
    }
};

export { Camera };