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

import { Camera } from "../Camera.js";
import { loadFile } from "../ResourceLoaders.js";
import { InstancedObject } from "./InstancedObject.js";
import { Mesh } from "./Mesh.js";
import { RenderState } from "./RenderState.js";
import { ShaderProgram } from "./ShaderProgram.js";
import { ImageTexture } from "./ImageTexture.js";
import { SpritesheetInfo } from "./SpritesheetInfo.js";
import { TilesheetInfo } from "./TilesheetInfo.js";
import { SceneNode } from "./SceneNode.js";
import { Material } from "./Material.js";

declare var window: any;

interface TilesheetTexture extends ImageTexture {
    info: TilesheetInfo;
};

interface SpritesheetTexture extends ImageTexture {
    info: SpritesheetInfo;
};

class SceneRoot implements SceneNode {
    children: SceneNode[];
    objects: InstancedObject[];
    parent: SceneNode;

    constructor() {
        this.children = [];
        this.objects = [];
        this.parent = null;
    }

    setParent(parent: SceneNode) {
        this.parent = parent;
    }

    addChild(child: SceneNode) {
        this.children.push(child);
    }
    
    addObject(object: InstancedObject) {
        this.objects.push(object);
    }
};

class Renderer {
    camera: Camera;
    gl: WebGL2RenderingContext;
    state: RenderState;
    projectionMatrix: Float32Array;
    root: SceneRoot;

    constructor(context: WebGL2RenderingContext) {
        this.gl = context;
        this.root = new SceneRoot();
        this.state = new RenderState(this.root as SceneNode);

        this.gl.clearColor(0.0, 0.0, 0.0, 1.0); // clear canvas to black
        this.gl.clearDepth(1.0); // clear depth buffer
        this.gl.enable(this.gl.CULL_FACE);
        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.depthFunc(this.gl.LEQUAL); // near things obscure far things

        // setup camera and initial rendering matrices
        this.camera = new Camera(
            new Float32Array([0, 10, 0]),
            new Float32Array([1, -1, 0]),
            new Float32Array([0, 1, 0]));
        //this.camera.lookAt(new Float32Array([10, 0, 10]));
        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
        this.resize(); // setup persepctive matrix
    }

    get ready() {
        return this.state.activeShader in this.state.loadedShaders;
    }

    render(elapsedMs: number) {
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.gl.useProgram(this.state.shader.program);
        this.gl.uniformMatrix4fv(this.state.shader.uniformLocations.projectionMatrix, false, this.projectionMatrix);
        this.gl.uniformMatrix4fv(this.state.shader.uniformLocations.viewMatrix, false, this.camera.viewMatrix);
        let node = this.state.sceneRoot;
        let children: SceneNode[] = [node].concat(node.children);
        do {
            let next: SceneNode[] = [];
            for(let i = 0; i < children.length; ++i) {
                const child = children[i];
                const objects = child.objects;
                for(let j = 0; j < objects.length; ++j) {
                    const obj = objects[j];
                    this.gl.bindVertexArray(obj.vao);
                    if(obj.material !== null && obj.material in this.state.loadedMaterials) {
                        const material = this.state.loadedMaterials[obj.material];
                        // TODO: Render by material to avoid redundant uniform binds
                        this.gl.uniform3f(
                            this.state.shader.uniformLocations[`material.ambientColor`],
                            material.ambientColor[0],
                            material.ambientColor[1],
                            material.ambientColor[2]);
                        this.gl.uniform3f(this.state.shader.uniformLocations[`material.diffuseColor`],
                            material.diffuseColor[0],
                            material.diffuseColor[1],
                            material.diffuseColor[2]);
                        this.gl.uniform3f(this.state.shader.uniformLocations[`material.specularColor`],
                            material.specularColor[0],
                            material.specularColor[1],
                            material.specularColor[2]);
                        this.gl.uniform3f(this.state.shader.uniformLocations[`material.transmissionFilter`],
                            material.transmissionFilter[0],
                            material.transmissionFilter[1],
                            material.transmissionFilter[2]);
                        this.gl.uniform1f(this.state.shader.uniformLocations[`material.illuminationModel`], material.illuminationModel);
                        this.gl.uniform1f(this.state.shader.uniformLocations[`material.dissolveFactor`], material.dissolveFactor);
                        this.gl.uniform1f(this.state.shader.uniformLocations[`material.specularExponent`], material.specularExponent);
                        this.gl.uniform1f(this.state.shader.uniformLocations[`material.sharpness`], material.sharpness);
                        this.gl.uniform1f(this.state.shader.uniformLocations[`material.refractionIndex`], material.refractionIndex);
                    }
                    for(let k = 0; k < obj.textures.length; ++k) {
                        this.gl.uniform1i(this.state.shader.uniformLocations[`sampler${k}`], k);
                        this.gl.activeTexture(this.gl.TEXTURE0 + k);
                        this.gl.bindTexture(this.gl.TEXTURE_2D, this.state.loadedTextures[obj.textures[k]].id);
                    }
                    this.gl.drawElementsInstanced(obj.mode, obj.index.count, obj.index.type, obj.index.offset, obj.instances.count);
                }
                next = next.concat(child.children);
            }
            children = next;
        } while(children.length > 0);
    }

    getMesh(name: string) : Mesh | null{
        if(name in this.state.loadedMeshes)
            return this.state.loadedMeshes[name];
        return null;
    }

    loadMaterialFile(data: string) : {[name: string]: Material} {
        const materials : {[name: string]: Material} = {};
        let materialName: string = null;

        // TODO: Handle optional parameters properly to fully support .mtl file format
         // currently use "K r g b" format, no spectral file or xyz format support
        const lines = data.split(/\n/);
        for(let i = 0; i < lines.length; ++i) {
            let inComment = false;
            const tokens = lines[i].split(/\s/).filter((token: string) => {
                if(token === '#')
                    inComment = true;
                return !inComment && token.length > 0;
            });
            if(tokens.length === 0)
                continue;
            if(tokens[0] === 'Ka') {
                materials[materialName].ambientColor[0] = parseFloat(tokens[1]);
                materials[materialName].ambientColor[1] = parseFloat(tokens[2]);
                materials[materialName].ambientColor[2] = parseFloat(tokens[3]);
            } else if(tokens[0] === 'Kd') {
                materials[materialName].diffuseColor[0] = parseFloat(tokens[1]);
                materials[materialName].diffuseColor[1] = parseFloat(tokens[2]);
                materials[materialName].diffuseColor[2] = parseFloat(tokens[3]);
            } else if(tokens[0] === 'Ks') {
                materials[materialName].specularColor[0] = parseFloat(tokens[1]);
                materials[materialName].specularColor[1] = parseFloat(tokens[2]);
                materials[materialName].specularColor[2] = parseFloat(tokens[3]);
            } else if(tokens[0] === 'Tf') {
                materials[materialName].transmissionFilter[0] = parseFloat(tokens[1]);
                materials[materialName].transmissionFilter[1] = parseFloat(tokens[2]);
                materials[materialName].transmissionFilter[2] = parseFloat(tokens[3]);
            } else if(tokens[0] === 'd') {
                materials[materialName].dissolveFactor = parseFloat(tokens[1]);
            } else if(tokens[0] === 'illum') {
                materials[materialName].illuminationModel = parseInt(tokens[1]);
            } else if(tokens[0] === 'Ns') {
                materials[materialName].specularExponent = parseFloat(tokens[1]);
            } else if(tokens[0] === 'sharpness') {
                materials[materialName].sharpness = parseFloat(tokens[1]);
            } else if(tokens[0] === 'Ni') {
                materials[materialName].refractionIndex = parseFloat(tokens[1]);
            } else if(tokens[0] === 'newmtl') {
                materialName = tokens[1];
                materials[materialName] = {
                    ambientColor: new Float32Array(3),
                    diffuseColor: new Float32Array(3),
                    specularColor: new Float32Array(3),
                    transmissionFilter: new Float32Array(3),
                    illuminationModel: 1,
                    dissolveFactor: 1.0,
                    specularExponent: 1,
                    sharpness: 60,
                    refractionIndex: 1.0
                };
            }
        }
        return materials;
    }

    loadObjFile(data: string, name: string = null) : Mesh {
        let geometryCoords: number[] = [];
        let textureCoords: number[] = [];
        let normalCoords: number[] = [];
        let vertexIndices: number[] = [];
        let textureIndices: number[] = [];
        let normalIndices: number[] = [];
        let groupName: string = null;
        let materialName: string = null;
        let mode: GLenum = this.gl.TRIANGLES;
        const mesh: Mesh = new Mesh();

        // TODO: handle Bezier curves, 3D textures and other cool shit like that
        // TODO: Handle optional parameters properly to fully support .obj file format
        const lines = data.split(/\n/).concat(['g']);
        for(let i = 0; i < lines.length; ++i) {
            let inComment = false;
            const tokens = lines[i].split(/\s/).filter((token: string) => {
                if(token === '#')
                    inComment = true;
                return !inComment && token.length > 0;
            });
            if(tokens.length === 0)
                continue;
            if(tokens[0] === 'v') { // vertex coords
                geometryCoords = geometryCoords.concat([
                    parseFloat(tokens[1]), // x
                    parseFloat(tokens[2]), // y
                    parseFloat(tokens[3]), // z
                    1.0 // w
                ]);
            } else if(tokens[0] === 'vt') { // texture coords
                textureCoords.push(parseFloat(tokens[1])); // u
                textureCoords.push(parseFloat(tokens[2])); // v
            } else if(tokens[0] === 'vn') { // vertex normal
                normalCoords = normalCoords.concat([
                    parseFloat(tokens[1]), // i
                    parseFloat(tokens[2]), // j
                    parseFloat(tokens[3])  // k
                ]);
            } else if(tokens[0] === 'f') { // add face indices for use in GL_TRIANGLES mode
                for(let j = 1; j < tokens.length; ++j) {
                    const indices = tokens[j].split('/');
                    vertexIndices.push(parseInt(indices[0]));  // v index
                    textureIndices.push(parseInt(indices[1])); // vt index
                    normalIndices.push(parseInt(indices[2]));  // vn index
                }
                mode = this.gl.TRIANGLES;
            } else if(tokens[0] === 'p') { // add indices for use in GL_POINTS mode
                for(let j = 1; j < tokens.length; ++j)
                    vertexIndices.push(parseInt(tokens[j]));
                mode = this.gl.POINTS;
            } else if(tokens[0] === 'l') { // add both indices for use in GL_LINES and GL_LINE_LOOP mode
                for(let j = 1; j < tokens.length; ++j) {
                    const indices = tokens[j].split('/');
                    vertexIndices.push(parseInt(indices[0]));
                    textureIndices.push(parseInt(indices[1]));
                }
                mode = this.gl.LINES;
            } else if (tokens[0] === 'mtllib') { // associated .mtl file
                const path = tokens[1];
                const pathRegex = /(.*\/)*(.+)(\.mtl)*/;
                const matches = path.match(pathRegex);
                if(matches === null) // always matches if path.length > 0
                    continue;
                else {
                    const location = matches[0];
                    const name = matches[1];
                    const fileType = matches[2];
                    if(name in this.state.loadedMaterials)
                        continue;
                    loadFile(`./objects/${path}`, (req: XMLHttpRequest) => {
                        console.info(`Material library file loaded at ${path}:`);
                        const newMaterials = this.loadMaterialFile(req.responseText);
                        for(let key in newMaterials) {
                            if(key in this.state.loadedMaterials)
                                console.error(`${key} already loaded material`);
                            else
                                this.state.loadedMaterials[name] = newMaterials[key];
                        }
                    });
                }
            } else if(tokens[0] === 'o') { // new model name
                name = tokens[1];
            } else if(tokens[0] === 'g') { // new polygon group
                if(vertexIndices.length > 0) {
                    let groupObject: InstancedObject;
                    if(mode === this.gl.POINTS) {
                        let coords = [];
                        let indices = [];
                        for(let j = 0; j < vertexIndices.length; ++j){
                            let index = 4*vertexIndices[j];
                            coords.push(geometryCoords[index]);
                            coords.push(geometryCoords[index + 1]);
                            coords.push(geometryCoords[index + 2]);
                            coords.push(geometryCoords[index + 3]);
                            indices.push(j);
                        }
                        groupObject = this.createPointsMesh(coords, indices);
                    } else if(mode === this.gl.LINES) {
                        let coords = [];
                        let uvs = [];
                        let indices = [];
                        for(let j = 0; j < vertexIndices.length; ++j){
                            let posIndex = 4*vertexIndices[j];
                            coords.push(geometryCoords[posIndex]);
                            coords.push(geometryCoords[posIndex + 1]);
                            coords.push(geometryCoords[posIndex + 2]);
                            coords.push(geometryCoords[posIndex + 3]);
                            if(j < textureIndices.length) {
                                let texIndex = 2*textureIndices[j];
                                uvs.push(textureCoords[texIndex]);
                                uvs.push(1-textureCoords[texIndex + 1]);
                            }
                            indices.push(j);
                        }
                        groupObject = this.createLinesMesh(coords, uvs, indices, ((coords.length/4) % 2) !== 0);
                        if(materialName !== null)
                            groupObject.setMaterial(materialName);
                    } else if(mode === this.gl.TRIANGLES) {
                        let coords = [];
                        let uvs = [];
                        let normals = [];
                        let indices = [];
                        for(let j = 0; j < vertexIndices.length; ++j) {
                            // 1-indexed because obj I'm using is like that
                            let posIndex = 4*(vertexIndices[j]-1);
                            coords.push(geometryCoords[posIndex]);
                            coords.push(geometryCoords[posIndex + 1]);
                            coords.push(geometryCoords[posIndex + 2]);
                            coords.push(geometryCoords[posIndex + 3]);
                            if(j < textureIndices.length) {
                                let texIndex = 2*(textureIndices[j]-1);
                                uvs.push(textureCoords[texIndex]);
                                uvs.push(1-textureCoords[texIndex + 1]);
                            }
                            if(j < normalIndices.length) {
                                let normalIndex = 3*(normalIndices[j]-1);
                                normals.push(normalCoords[normalIndex]);
                                normals.push(normalCoords[normalIndex + 1]);
                                normals.push(normalCoords[normalIndex + 2]);
                            }
                            indices.push(j);
                        }
                        groupObject = this.createTexturedTriangleMesh(coords, uvs, normals, indices);
                        if(materialName !== null)
                            groupObject.setMaterial(materialName);
                        vertexIndices = [];
                        textureIndices = [];
                        normalIndices = [];
                        // TODO: Work out mesh so that submeshes can refer to same verts/uvs/normals/indices
                    }
                    if(groupName === null)
                        mesh.addComponent(groupObject);
                    else
                        mesh.addComponent(groupObject, groupName);
                    // TODO: Only add meshes on first instancing
                    this.state.sceneRoot.addObject(groupObject); // add for later instancing
                }
                groupName = tokens[1];
            } else if(tokens[0] === 'usemtl') { // turn on material
                materialName = tokens[1];
            } else if(tokens[0] === 'usemap') { // use map?
            } else {
                console.log(lines[i]);
            }
        }
        console.info(`${geometryCoords.length/4} geometry vertices loaded.`);
        console.info(`${textureCoords.length/2} texture vertices loaded.`);
        console.info(`${normalCoords.length/3} normal vertices loaded.`);
        if(name !== null) // for now leave unnamed meshes unloaded because we can't find them easily
            this.state.loadedMeshes[name] = mesh;
        return mesh;
    }

    loadTilesheet(name: string, img: HTMLImageElement) {
        // load accompanying text file to get tile size and margins
        loadFile(`./json/${name}.json`, (xhr: XMLHttpRequest) => {
            let texture = this.readImgToTexture(img, this.gl.RGBA, this.gl.UNSIGNED_BYTE) as TilesheetTexture;
            texture.info = JSON.parse(xhr.responseText);
            this.state.loadedTextures[name] = texture;
        }, (ev) => {
            console.error(ev);
        }, "application/json");
    }

    loadSpritesheet(name: string, img: HTMLImageElement) {
        // load accompanying text file to get sprite info
        loadFile(`./json/${name}.json`, (xhr: XMLHttpRequest) => {
            let texture = this.readImgToTexture(img, this.gl.RGBA, this.gl.UNSIGNED_BYTE) as SpritesheetTexture;
            texture.info = JSON.parse(xhr.responseText);
            this.state.loadedTextures[name] = texture;
        }, (ev) => {
            console.error(ev);
        }, "application/json");
    }

    loadImage(name: string, img: HTMLImageElement) {
        this.state.loadedTextures[name] = this.readImgToTexture(img, this.gl.RGBA, this.gl.UNSIGNED_BYTE);
    }

    readImgToTexture(img: HTMLImageElement,
        format: GLenum,
        type: GLenum,
        width: number = img.width,
        height: number = img.height,
        lod: number = 0) : ImageTexture {
        let texture: ImageTexture = {
            id: this.gl.createTexture(),
            base: img
        };
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture.id);
        this.gl.texImage2D(this.gl.TEXTURE_2D, lod, this.gl.RGBA, width, height, 0, format, type, img);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.REPEAT);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.REPEAT);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
        return texture;
    }

    resize() {
        let fieldOfView = 45 * Math.PI / 180;
        let aspect = this.gl.canvas.width / this.gl.canvas.height;
        let zNear = 0.1;
        let zFar = 1000.0;
        this.projectionMatrix = window.mat4.create();
        window.mat4.perspective(this.projectionMatrix, fieldOfView, aspect, zNear, zFar);
    }

    createPointsMesh(positions: number[], indices: number[]) : InstancedObject {
        let vao = this.gl.createVertexArray();
        this.gl.bindVertexArray(vao);

        let vertexBuf = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexBuf);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW);
        this.gl.vertexAttribPointer(this.state.shader.attribLocations.vertexPosition, 4, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(this.state.shader.attribLocations.vertexPosition);

        let matrixBuf = this.gl.createBuffer();
        let vec4Size = 4 * Float32Array.BYTES_PER_ELEMENT;
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, matrixBuf); // don't initialize any instances yet
        this.gl.vertexAttribPointer(this.state.shader.attribLocations.instanceMatrix, 4, this.gl.FLOAT, false, 4*vec4Size , 0);
        this.gl.vertexAttribPointer(this.state.shader.attribLocations.instanceMatrix + 1, 4, this.gl.FLOAT, false, 4*vec4Size, vec4Size);
        this.gl.vertexAttribPointer(this.state.shader.attribLocations.instanceMatrix + 2, 4, this.gl.FLOAT, false, 4*vec4Size, 2 * vec4Size);
        this.gl.vertexAttribPointer(this.state.shader.attribLocations.instanceMatrix + 3, 4, this.gl.FLOAT, false, 4*vec4Size, 3 * vec4Size);

        this.gl.enableVertexAttribArray(this.state.shader.attribLocations.instanceMatrix);
        this.gl.enableVertexAttribArray(this.state.shader.attribLocations.instanceMatrix + 1);
        this.gl.enableVertexAttribArray(this.state.shader.attribLocations.instanceMatrix + 2);
        this.gl.enableVertexAttribArray(this.state.shader.attribLocations.instanceMatrix + 3);

        this.gl.vertexAttribDivisor(this.state.shader.attribLocations.instanceMatrix, 1);
        this.gl.vertexAttribDivisor(this.state.shader.attribLocations.instanceMatrix + 1, 1);
        this.gl.vertexAttribDivisor(this.state.shader.attribLocations.instanceMatrix + 2, 1);
        this.gl.vertexAttribDivisor(this.state.shader.attribLocations.instanceMatrix + 3, 1);

        let indexBuf = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, indexBuf);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), this.gl.STATIC_DRAW);

        let builtObject = new InstancedObject(vao, matrixBuf, this.gl.POINTS);
        builtObject.index = {
            count: indices.length,
            type: this.gl.UNSIGNED_SHORT,
            offset: 0
        };
        return builtObject;
    }

    createLinesMesh(positions: number[], colors: number[], indices: number[], loop: boolean = false) : InstancedObject {
        let vao = this.gl.createVertexArray();
        this.gl.bindVertexArray(vao);

        let vertexBuf = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexBuf);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW);
        this.gl.vertexAttribPointer(this.state.shader.attribLocations.vertexPosition, 4, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(this.state.shader.attribLocations.vertexPosition);

        let colorBuf = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, colorBuf);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(colors), this.gl.STATIC_DRAW);
        this.gl.vertexAttribPointer(this.state.shader.attribLocations.vertexColor, 4, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(this.state.shader.attribLocations.vertexColor);

        let matrixBuf = this.gl.createBuffer();
        let vec4Size = 4 * Float32Array.BYTES_PER_ELEMENT;
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, matrixBuf); // don't initialize any instances yet
        this.gl.vertexAttribPointer(this.state.shader.attribLocations.instanceMatrix, 4, this.gl.FLOAT, false, 4*vec4Size , 0);
        this.gl.vertexAttribPointer(this.state.shader.attribLocations.instanceMatrix + 1, 4, this.gl.FLOAT, false, 4*vec4Size, vec4Size);
        this.gl.vertexAttribPointer(this.state.shader.attribLocations.instanceMatrix + 2, 4, this.gl.FLOAT, false, 4*vec4Size, 2 * vec4Size);
        this.gl.vertexAttribPointer(this.state.shader.attribLocations.instanceMatrix + 3, 4, this.gl.FLOAT, false, 4*vec4Size, 3 * vec4Size);

        this.gl.enableVertexAttribArray(this.state.shader.attribLocations.instanceMatrix);
        this.gl.enableVertexAttribArray(this.state.shader.attribLocations.instanceMatrix + 1);
        this.gl.enableVertexAttribArray(this.state.shader.attribLocations.instanceMatrix + 2);
        this.gl.enableVertexAttribArray(this.state.shader.attribLocations.instanceMatrix + 3);

        this.gl.vertexAttribDivisor(this.state.shader.attribLocations.instanceMatrix, 1);
        this.gl.vertexAttribDivisor(this.state.shader.attribLocations.instanceMatrix + 1, 1);
        this.gl.vertexAttribDivisor(this.state.shader.attribLocations.instanceMatrix + 2, 1);
        this.gl.vertexAttribDivisor(this.state.shader.attribLocations.instanceMatrix + 3, 1);

        let indexBuf = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, indexBuf);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), this.gl.STATIC_DRAW);

        let builtObject = new InstancedObject(vao, matrixBuf, loop ? this.gl.LINE_LOOP : this.gl.LINES);
        builtObject.index = {
            count: indices.length,
            type: this.gl.UNSIGNED_SHORT,
            offset: 0
        };
        return builtObject;
    }

    createTexturedLinesMesh(positions: number[], uvs: number[], indices: number[], loop: boolean = false) : InstancedObject {
        let vao = this.gl.createVertexArray();
        this.gl.bindVertexArray(vao);

        let vertexBuf = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexBuf);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW);
        this.gl.vertexAttribPointer(this.state.shader.attribLocations.vertexPosition, 4, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(this.state.shader.attribLocations.vertexPosition);

        let uvBuf = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, uvBuf);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(uvs), this.gl.STATIC_DRAW);
        this.gl.vertexAttribPointer(this.state.shader.attribLocations.textureCoord, 2, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(this.state.shader.attribLocations.textureCoord);

        let matrixBuf = this.gl.createBuffer();
        let vec4Size = 4 * Float32Array.BYTES_PER_ELEMENT;
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, matrixBuf); // don't initialize any instances yet
        this.gl.vertexAttribPointer(this.state.shader.attribLocations.instanceMatrix, 4, this.gl.FLOAT, false, 4*vec4Size , 0);
        this.gl.vertexAttribPointer(this.state.shader.attribLocations.instanceMatrix + 1, 4, this.gl.FLOAT, false, 4*vec4Size, vec4Size);
        this.gl.vertexAttribPointer(this.state.shader.attribLocations.instanceMatrix + 2, 4, this.gl.FLOAT, false, 4*vec4Size, 2 * vec4Size);
        this.gl.vertexAttribPointer(this.state.shader.attribLocations.instanceMatrix + 3, 4, this.gl.FLOAT, false, 4*vec4Size, 3 * vec4Size);

        this.gl.enableVertexAttribArray(this.state.shader.attribLocations.instanceMatrix);
        this.gl.enableVertexAttribArray(this.state.shader.attribLocations.instanceMatrix + 1);
        this.gl.enableVertexAttribArray(this.state.shader.attribLocations.instanceMatrix + 2);
        this.gl.enableVertexAttribArray(this.state.shader.attribLocations.instanceMatrix + 3);

        this.gl.vertexAttribDivisor(this.state.shader.attribLocations.instanceMatrix, 1);
        this.gl.vertexAttribDivisor(this.state.shader.attribLocations.instanceMatrix + 1, 1);
        this.gl.vertexAttribDivisor(this.state.shader.attribLocations.instanceMatrix + 2, 1);
        this.gl.vertexAttribDivisor(this.state.shader.attribLocations.instanceMatrix + 3, 1);

        let indexBuf = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, indexBuf);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), this.gl.STATIC_DRAW);

        let builtObject = new InstancedObject(vao, matrixBuf, loop ? this.gl.LINE_LOOP : this.gl.LINES);
        builtObject.index = {
            count: indices.length,
            type: this.gl.UNSIGNED_SHORT,
            offset: 0
        };
        return builtObject;
    }

    createTriangleMesh(positions: number[], colors: number[], normals: number[], indices: number[]) : InstancedObject {
        let vao = this.gl.createVertexArray();
        this.gl.bindVertexArray(vao);

        let vertexBuf = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexBuf);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW);
        this.gl.vertexAttribPointer(this.state.shader.attribLocations.vertexPosition, 4, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(this.state.shader.attribLocations.vertexPosition);

        let colorBuf = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, colorBuf);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(colors), this.gl.STATIC_DRAW);
        this.gl.vertexAttribPointer(this.state.shader.attribLocations.vertexColor, 4, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(this.state.shader.attribLocations.vertexColor);

        let normalBuf = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, normalBuf);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(normals), this.gl.STATIC_DRAW);
        this.gl.vertexAttribPointer(this.state.shader.attribLocations.vertexNormal, 3, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(this.state.shader.attribLocations.vertexNormal);

        let matrixBuf = this.gl.createBuffer();
        let vec4Size = 4 * Float32Array.BYTES_PER_ELEMENT;
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, matrixBuf); // don't initialize any instances yet
        this.gl.vertexAttribPointer(this.state.shader.attribLocations.instanceMatrix, 4, this.gl.FLOAT, false, 4*vec4Size , 0);
        this.gl.vertexAttribPointer(this.state.shader.attribLocations.instanceMatrix + 1, 4, this.gl.FLOAT, false, 4*vec4Size, vec4Size);
        this.gl.vertexAttribPointer(this.state.shader.attribLocations.instanceMatrix + 2, 4, this.gl.FLOAT, false, 4*vec4Size, 2 * vec4Size);
        this.gl.vertexAttribPointer(this.state.shader.attribLocations.instanceMatrix + 3, 4, this.gl.FLOAT, false, 4*vec4Size, 3 * vec4Size);

        this.gl.enableVertexAttribArray(this.state.shader.attribLocations.instanceMatrix);
        this.gl.enableVertexAttribArray(this.state.shader.attribLocations.instanceMatrix + 1);
        this.gl.enableVertexAttribArray(this.state.shader.attribLocations.instanceMatrix + 2);
        this.gl.enableVertexAttribArray(this.state.shader.attribLocations.instanceMatrix + 3);

        this.gl.vertexAttribDivisor(this.state.shader.attribLocations.instanceMatrix, 1);
        this.gl.vertexAttribDivisor(this.state.shader.attribLocations.instanceMatrix + 1, 1);
        this.gl.vertexAttribDivisor(this.state.shader.attribLocations.instanceMatrix + 2, 1);
        this.gl.vertexAttribDivisor(this.state.shader.attribLocations.instanceMatrix + 3, 1);

        let indexBuf = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, indexBuf);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), this.gl.STATIC_DRAW);

        let builtObject = new InstancedObject(vao, matrixBuf, this.gl.TRIANGLES);
        builtObject.index = {
            count: indices.length,
            type: this.gl.UNSIGNED_SHORT,
            offset: 0
        };
        return builtObject;
    }

    createTexturedTriangleMesh(positions: number[], uvs: number[], normals: number[], indices: number[]) : InstancedObject {
        let vao = this.gl.createVertexArray();
        this.gl.bindVertexArray(vao);

        let vertexBuf = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexBuf);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW);
        this.gl.vertexAttribPointer(this.state.shader.attribLocations.vertexPosition, 4, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(this.state.shader.attribLocations.vertexPosition);

        let uvBuf = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, uvBuf);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(uvs), this.gl.STATIC_DRAW);
        this.gl.vertexAttribPointer(this.state.shader.attribLocations.textureCoord, 2, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(this.state.shader.attribLocations.textureCoord);

        let normalBuf = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, normalBuf);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(normals), this.gl.STATIC_DRAW);
        this.gl.vertexAttribPointer(this.state.shader.attribLocations.vertexNormal, 3, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(this.state.shader.attribLocations.vertexNormal);

        let matrixBuf = this.gl.createBuffer();
        let vec4Size = 4 * Float32Array.BYTES_PER_ELEMENT;
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, matrixBuf); // don't initialize any instances yet
        this.gl.vertexAttribPointer(this.state.shader.attribLocations.instanceMatrix, 4, this.gl.FLOAT, false, 4*vec4Size, 0);
        this.gl.vertexAttribPointer(this.state.shader.attribLocations.instanceMatrix + 1, 4, this.gl.FLOAT, false, 4*vec4Size, vec4Size);
        this.gl.vertexAttribPointer(this.state.shader.attribLocations.instanceMatrix + 2, 4, this.gl.FLOAT, false, 4*vec4Size, 2 * vec4Size);
        this.gl.vertexAttribPointer(this.state.shader.attribLocations.instanceMatrix + 3, 4, this.gl.FLOAT, false, 4*vec4Size, 3 * vec4Size);

        this.gl.enableVertexAttribArray(this.state.shader.attribLocations.instanceMatrix);
        this.gl.enableVertexAttribArray(this.state.shader.attribLocations.instanceMatrix + 1);
        this.gl.enableVertexAttribArray(this.state.shader.attribLocations.instanceMatrix + 2);
        this.gl.enableVertexAttribArray(this.state.shader.attribLocations.instanceMatrix + 3);

        this.gl.vertexAttribDivisor(this.state.shader.attribLocations.instanceMatrix, 1);
        this.gl.vertexAttribDivisor(this.state.shader.attribLocations.instanceMatrix + 1, 1);
        this.gl.vertexAttribDivisor(this.state.shader.attribLocations.instanceMatrix + 2, 1);
        this.gl.vertexAttribDivisor(this.state.shader.attribLocations.instanceMatrix + 3, 1);

        let indexBuf = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, indexBuf);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), this.gl.STATIC_DRAW);

        let builtObject = new InstancedObject(vao, matrixBuf, this.gl.TRIANGLES);
        builtObject.index = {
            count: indices.length,
            type: this.gl.UNSIGNED_SHORT,
            offset: 0
        };
        return builtObject;
    }

    setActiveShaderProgram(name: string) {
        if(name in this.state.loadedShaders)
            this.state.activeShader = name;
    }

    loadShaderProgram(name: string, activateOnLoad: boolean = false) {
        const infoFilePath = `json/${name}.json`;
        const vertexFilePath = `shaders/${name}Vertex.glsl`;
        const fragmentFilePath = `shaders/${name}Fragment.glsl`;
        loadFile(infoFilePath, (xhr) => {
            const shaderInfo = JSON.parse(xhr.responseText);
            loadFile(fragmentFilePath, (xhr) => {
                const fragShaderCode = xhr.responseText;
                loadFile(vertexFilePath, (xhr) => {
                    console.info(`Reading shader ${name} for opengl...`);
                    const vertexShaderCode = xhr.responseText;
                    const program = this.loadShaderProgramFromSource(vertexShaderCode, fragShaderCode);
                    if(program === null) {
                        console.error("Error loading shader program.");
                        return;
                    }
                    const shader: ShaderProgram = {
                        program: program,
                        attribLocations: {},
                        uniformLocations: {}
                    };
                    const attributes: {[name: string]: string} = shaderInfo["attributes"];
                    for(let key in attributes)
                        shader.attribLocations[key] = this.gl.getAttribLocation(program, attributes[key]);
                    const uniforms: {[name: string]: string} = shaderInfo["uniforms"];
                    for(let key in uniforms)
                        shader.uniformLocations[key] = this.gl.getUniformLocation(program, uniforms[key]);
                    this.state.loadedShaders[name] = shader;
                    if(activateOnLoad)
                        this.state.activeShader = name;
                    console.info(`Successfully loaded shader ${name}.`);
                });
            });
        }, (err) => {
            console.error(err);
        }, "application/json");
    }

    loadShaderProgramFromSource(vertexShaderSource: string, fragmentShaderSource: string) : WebGLProgram | null {
        const vshader = this.loadShader(this.gl.VERTEX_SHADER, vertexShaderSource);
        const fshader = this.loadShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);
        const program = this.gl.createProgram();
        this.gl.attachShader(program, vshader);
        this.gl.attachShader(program, fshader);
        this.gl.linkProgram(program);

        if(!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            alert('Unable to initialize shader program ' + this.gl.getProgramInfoLog(program));
            return null;
        }

        return program;
    }

    loadShader(type: GLenum, source: string) : WebGLShader | null {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        if(!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            alert('An error ocurred compiling shader ' + this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            return null;
        }

        return shader;
    }
};

export { Renderer };