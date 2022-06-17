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
import { loadFile } from "./ResourceLoaders.js";


declare var window: any;

interface ShaderProgram {
    program: WebGLProgram;
    attribLocations: {[attributeName: string]: GLint};
    uniformLocations: {[uniformName: string]: WebGLUniformLocation};
}

interface IndexAttribute {
    count: number;
    type: GLenum;
    offset: number;
};

interface InstanceList {
    data?: Float32Array;
    count: number;
    buffer: WebGLBuffer;
};

class InstancedObject {
    vao: WebGLVertexArrayObject;
    index: IndexAttribute
    instances: InstanceList;
    mode: GLenum;
    textures: WebGLTexture[];

    constructor(vao: WebGLVertexArrayObject, matrixBuffer: WebGLBuffer, mode: GLenum) {
        this.vao = vao;
        this.instances = {
            buffer: matrixBuffer,
            count: 0
        };
        this.mode = mode;
    }

    addInstance(gl: WebGL2RenderingContext, instanceData?: Float32Array) : number {
        if(!instanceData)
            instanceData = new Float32Array(window.mat4.create());
        if(this.instances.data)
            this.instances.data = Float32Array.of(...this.instances.data, ...instanceData);
        else
            this.instances.data = instanceData;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.instances.buffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.instances.data, gl.STATIC_DRAW);
        this.instances.count += 1;
        return this.instances.count - 1;
    }

    modifyInstance(gl: WebGL2RenderingContext, instanceIndex: number, instanceData: Float32Array) {
        let offset = 4*4*instanceIndex;
        this.instances.data.set(instanceData, offset);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.instances.buffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, offset * Float32Array.BYTES_PER_ELEMENT, instanceData);
    }

    addTexture(texture: WebGLTexture) {
        this.textures.push(texture);
    }
};

class Mesh {
    name?: string;
    components: InstancedObject[];
    namedComponents: {[name: string]: InstancedObject};

    constructor(name?: string) {
        this.components = []
        this.namedComponents = {};
        this.name = name;
    }

    addComponent(childObject: InstancedObject, name?: string) {
        if(name !== undefined)
            this.namedComponents[name] = childObject;
        else
            this.components.push(childObject);
    }
};

interface ImageTexture {
    id: WebGLTexture;
    base: HTMLImageElement;
};

class RenderState {
    activeShader: string;
    loadedShaders: {[name: string]: ShaderProgram};
    loadedTextures: {[name: string]: ImageTexture};
    loadedObjects: InstancedObject[];

    constructor() {
        this.activeShader = "";
        this.loadedShaders = {};
        this.loadedObjects = [];
        this.loadedTextures = {};
    }

    get shader(): ShaderProgram {
        return this.loadedShaders[this.activeShader];
    }
};

interface TilesheetInfo {
    name: string;
    tileWidth: number;
    tileHeight: number;
    margin: number;
};

interface SpritesheetInfo {
    name: string;
    spriteWidth: number;
    spriteHeight: number;
    margin: number;
};

interface TilesheetTexture extends ImageTexture {
    info: TilesheetInfo;
};

interface SpritesheetTexture extends ImageTexture {
    info: SpritesheetInfo;
};

class Renderer {
    camera: Camera;
    gl: WebGL2RenderingContext;
    state: RenderState;
    projectionMatrix: Float32Array;

    constructor(context: WebGL2RenderingContext) {
        this.gl = context;
        this.state = new RenderState();

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

    loadMeshObject(data: string) : Mesh {
        let geometryCoords: number[] = [];
        let textureCoords: number[] = [];
        let normalCoords: number[] = [];
        let vertexIndices: number[] = [];
        let textureIndices: number[] = [];
        let normalIndices: number[] = [];
        let meshName = null;
        let materialName = null;
        let mode = null;
        let mesh = new Mesh();

        // TODO: handle Bezier curves, 3D textures and other cool shit like that
        const lines = data.split(/\n/);
        for(let i = 0; i < lines.length; ++i) {
            const tokens = lines[i].split(/\s/).filter((token: string) => {
                return token.length > 0;
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
            } else if(tokens[0] === 'f') { // face
                // add face indices for use in GL_TRIANGLES mode
                for(let i = 1; i < tokens.length; ++i) {
                    const indices = tokens[i].split('/');
                    vertexIndices.push(parseInt(indices[0])); // v index
                    if(indices[1].length > 0)
                        textureIndices.push(parseInt(indices[1])); // vt index
                    if(indices[2].length > 0)
                        normalIndices.push(parseInt(indices[2])); // vn index
                }
                mode = this.gl.TRIANGLES;
            } else if(tokens[0] === 'p') { // point
                // add indices for use in GL_POINTS mode
                for(let i = 1; i < tokens.length; ++i)
                    vertexIndices.push(parseInt(tokens[i]));
                mode = this.gl.POINTS;
            } else if(tokens[0] === 'l') { // line
                // add both indices for use in GL_LINES mode
                for(let i = 1; i < tokens.length; ++i) {
                    const indices = tokens[i].split('/');
                    vertexIndices.push(parseInt(indices[0]));
                    if(indices[1].length > 0)
                        textureIndices.push(parseInt(indices[1]));
                }
                mode = this.gl.LINES;
            } else if (tokens[0] === 'mtllib') { // associated .mtl file
                // TODO: mats
            } else if(tokens[0] === 'o') { // new model
                mesh.name = tokens[1];
            } else if(tokens[0] === 'g') { // new polygon group
                if(vertexIndices.length > 0) {
                    let groupObject: InstancedObject;
                    if(mode === this.gl.POINTS) {
                        let coords = [];
                        let indices = [];
                        for(let i = 0; i < vertexIndices.length; ++i){
                            let index = 4*vertexIndices[i];
                            coords.push(geometryCoords[index]);
                            coords.push(geometryCoords[index + 1]);
                            coords.push(geometryCoords[index + 2]);
                            coords.push(geometryCoords[index + 3]);
                            indices.push(i);
                        }
                        groupObject = this.createPointsMesh(coords, indices);
                    } else if(mode === this.gl.LINES) {
                        let coords = [];
                        let uvs = [];
                        let indices = [];
                        for(let i = 0; i < vertexIndices.length; ++i){
                            let posIndex = 4*vertexIndices[i];
                            coords.push(geometryCoords[posIndex]);
                            coords.push(geometryCoords[posIndex + 1]);
                            coords.push(geometryCoords[posIndex + 2]);
                            coords.push(geometryCoords[posIndex + 3]);
                            if(i < textureIndices.length) {
                                let texIndex = 2*textureIndices[i];
                                uvs.push(textureCoords[texIndex]);
                                uvs.push(textureCoords[texIndex + 1]);
                            }
                            indices.push(i);
                        }
                        groupObject = this.createLinesMesh(coords, uvs, indices);
                    } else if(mode === this.gl.TRIANGLES) {
                        let coords = [];
                        let uvs = [];
                        let normals = [];
                        let indices = [];
                        for(let i = 0; i < vertexIndices.length; ++i){
                            let posIndex = 4*vertexIndices[i];
                            coords.push(geometryCoords[posIndex]);
                            coords.push(geometryCoords[posIndex + 1]);
                            coords.push(geometryCoords[posIndex + 2]);
                            coords.push(geometryCoords[posIndex + 3]);
                            if(i < textureIndices.length) {
                                let texIndex = 2*textureIndices[i];
                                uvs.push(textureCoords[texIndex]);
                                uvs.push(textureCoords[texIndex + 1]);
                            }
                            if(i < normalIndices.length) {
                                let normalIndex = 3*normalIndices[i];
                                normals.push(normalCoords[normalIndex]);
                                normals.push(normalCoords[normalIndex + 1]);
                                normals.push(normalCoords[normalIndex + 2]);
                            }
                            indices.push(i);
                        }
                        groupObject = this.createTexturedTriangleMesh(materialName, coords, uvs, normals, indices);
                    }
                    if(meshName === null) {
                        mesh.addComponent(groupObject);
                    } else {
                        mesh.addComponent(groupObject, meshName);
                    }
                }
                meshName = tokens[1];
            } else if(tokens[0] === 'usemtl') { // use material?
                materialName = tokens[1];
            } else {
                console.log(lines[i]);
            }
        }
        console.info(`${geometryCoords.length/4} vertices loaded.`);
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
        let zFar = 100.0;
        this.projectionMatrix = window.mat4.create();
        window.mat4.perspective(this.projectionMatrix, fieldOfView, aspect, zNear, zFar);
    }

    render(elapsedMs: number) {
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.gl.useProgram(this.state.shader.program);
        this.gl.uniformMatrix4fv(this.state.shader.uniformLocations.projectionMatrix, false, this.projectionMatrix);
        this.gl.uniformMatrix4fv(this.state.shader.uniformLocations.viewMatrix, false, this.camera.viewMatrix);
        for(let key in this.state.loadedObjects) {
            let obj = this.state.loadedObjects[key];
            this.gl.bindVertexArray(obj.vao);
            for(let i = 0; i < obj.textures.length; ++i) {
                this.gl.activeTexture(this.gl.TEXTURE0 + i);
                this.gl.bindTexture(this.gl.TEXTURE_2D, obj.textures[i]);
            }
            this.gl.drawElementsInstanced(obj.mode, obj.index.count, obj.index.type, obj.index.offset, obj.instances.count);
        }
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
        this.state.loadedObjects.push(builtObject);
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
        this.state.loadedObjects.push(builtObject);
        return builtObject;
    }

    createTexturedLinesMesh(name: string, positions: number[], uvs: number[], indices: number[], loop: boolean = false) : InstancedObject {
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
        builtObject.textures = [this.state.loadedTextures[name].id];
        this.state.loadedObjects.push(builtObject);
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
        this.state.loadedObjects.push(builtObject);
        return builtObject;
    }

    createTexturedTriangleMesh(name: string, positions: number[], uvs: number[], normals: number[], indices: number[]) : InstancedObject {
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
        builtObject.textures = [this.state.loadedTextures[name].id];
        this.state.loadedObjects.push(builtObject);
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

export { Renderer, InstanceList, InstancedObject };