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


import { Mesh } from "./Mesh.js";


class MeshController {
    mesh: Mesh;
    instanceIds: number[];
    namedInstanceIds: {[name: string]: number};

    constructor(gl: WebGL2RenderingContext, mesh: Mesh) {
        this.mesh = mesh;
        this.instanceIds = [];
        this.namedInstanceIds = {};
        for(let i = 0; i < mesh.components.length; ++i)
            this.instanceIds.push(mesh.components[i].addInstance(gl));
        for(let key in mesh.namedComponents)
            this.namedInstanceIds[key] = mesh.namedComponents[key].addInstance(gl);
    }
};


export { MeshController };