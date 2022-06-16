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
    index: IndexAttribute;
    instances: InstanceList;

    constructor(vao: WebGLVertexArrayObject, matrixBuffer: WebGLBuffer) {
        this.vao = vao;
        this.instances = {
            buffer: matrixBuffer,
            count: 0
        };
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

class RenderState {
    activeShader: string;
    loadedShaders: {[name: string]: ShaderProgram};
    loadedTextures: {[name: string]: WebGLTexture};
    loadedObjects: InstancedObject[];

    constructor() {
        this.activeShader = "";
        this.loadedShaders = {};
        this.loadedObjects = [];
        this.loadedTextures = {};
    }

    get shader(): ShaderProgram | null {
        if(this.activeShader in this.loadedShaders)
            return this.loadedShaders[this.activeShader];
        return null;
    }
};

class Renderer {
    camera: Camera;
    gl: WebGL2RenderingContext;
    state: RenderState;
    instancedFloor: InstancedObject;
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
        return this.state.shader !== null;
    }

    loadObject(data: string) {
        let positions: number[] = [];
        let colors: number[] = [];
        let indices: number[] = [];

        const lines = data.split(/\n/);
        for(let i = 0; i < lines.length; i++) {
            const tokens = lines[i].split(/\s/).filter((token: string) => {
                return token.length > 0;
            });
            if(tokens.length === 0)
                continue;
            if(tokens[0] === 'v') { // vertex position
                positions = positions.concat([
                    parseInt(tokens[1]),
                    parseInt(tokens[2]),
                    parseInt(tokens[3])
                ]);
            } else if(tokens[0] === 'vt') { // vertex uv
                // TODO: replace colors with uvs
                colors = colors.concat([
                    parseInt(tokens[1]),
                    parseInt(tokens[2])
                ]);
            } else if(tokens[0] === 'vn') { // vertex normal
                // TODO: do shit with normals
            }
        }
        console.log(positions);
        console.log(colors);
        console.log(indices);
    }

    loadTilesheet(name: string, img: HTMLImageElement) {
        // load accompanying text file to get tile size and margins
        loadFile(`./json/${name}.json`, (xhr: XMLHttpRequest) => {
            const info: TilesheetInfo = JSON.parse(xhr.responseText);
            const versionMatch = name.match(/(@\d)/);
        }, (ev) => {
            console.error(ev);
        }, "application/json");
    }

    loadSpritesheet(name: string, img: HTMLImageElement) {
        // load accompanying text file to get sprite info
        loadFile(`./json/${name}.json`, (xhr: XMLHttpRequest) => {
            const info: SpritesheetInfo = JSON.parse(xhr.responseText);
            const versionMatch = name.match(/(@\d)/);
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
        x: number = 0,
        y: number = 0,
        width: number = img.width,
        height: number = img.height,
        lod: number = 0) {
        const texture: WebGLTexture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
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
        this.gl.uniformMatrix4fv(this.state.shader.uniformLocations.viewMatrix, false, this.camera.view);
        for(let key in this.state.loadedObjects) {
            let obj = this.state.loadedObjects[key];
            this.gl.bindVertexArray(obj.vao);
            this.gl.drawElementsInstanced(this.gl.TRIANGLES, obj.index.count, obj.index.type, obj.index.offset, obj.instances.count);
        }
    }

    createInstancedObject(positions: number[], colors: number[], indices: number[]) : InstancedObject {
        let vao = this.gl.createVertexArray();
        this.gl.bindVertexArray(vao);

        let vertexBuf = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexBuf);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW);
        this.gl.vertexAttribPointer(this.state.shader.attribLocations.vertexPosition, 3, this.gl.FLOAT, false, 0, 0);
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

        let builtObject = new InstancedObject(vao, matrixBuf);
        builtObject.index = {
            count: indices.length,
            type: this.gl.UNSIGNED_SHORT,
            offset: 0
        };
        this.state.loadedObjects.push(builtObject);
        return builtObject;
    }

    createTexturedInstancedObject(name: string, positions: number[], uvs: number[], indices: number[]) : InstancedObject {
        let vao = this.gl.createVertexArray();
        this.gl.bindVertexArray(vao);

        let vertexBuf = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexBuf);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW);
        this.gl.vertexAttribPointer(this.state.shader.attribLocations.vertexPosition, 3, this.gl.FLOAT, false, 0, 0);
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

        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.state.loadedTextures[name]);
        this.gl.uniform1i(this.state.shader.uniformLocations.sampler, 0);

        let builtObject = new InstancedObject(vao, matrixBuf);
        builtObject.index = {
            count: indices.length,
            type: this.gl.UNSIGNED_SHORT,
            offset: 0
        };
        this.state.loadedObjects.push(builtObject);
        return builtObject;
    }

    setActiveShaderProgram(name: string) {
        if(name in this.state.loadedShaders)
            this.state.activeShader = name;
    }

    loadShaderProgram(name: string, activateOnLoad: boolean = false) {
        const infoFilePath = `shaders/${name}.json`;
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