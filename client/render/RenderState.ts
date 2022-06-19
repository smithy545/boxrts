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

import { Material } from "./Material.js";
import { Mesh } from "./Mesh.js";
import { ShaderProgram } from "./ShaderProgram.js";
import { ImageTexture } from "./ImageTexture.js";
import { SceneNode } from "./SceneNode.js";

class RenderState {
    activeShader: string;
    loadedShaders: {[name: string]: ShaderProgram};
    loadedTextures: {[name: string]: ImageTexture};
    loadedMeshes: {[name: string]: Mesh};
    loadedMaterials: {[name: string]: Material};
    sceneRoot: SceneNode;

    constructor(sceneRoot: SceneNode) {
        this.activeShader = "";
        this.loadedShaders = {};
        this.loadedTextures = {};
        this.loadedMeshes = {};
        this.loadedMaterials = {};
        this.sceneRoot = sceneRoot;
    }

    get shader(): ShaderProgram {
        return this.loadedShaders[this.activeShader];
    }
};

export { RenderState };