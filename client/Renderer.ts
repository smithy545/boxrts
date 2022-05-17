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


interface ShaderProgram {
    program: WebGLProgram;
    attribLocations: {[attributeName: string]: GLint};
    uniformLocations: {[uniformName: string]: WebGLUniformLocation};
}

interface VertexAttribute {
    buffer: WebGLBuffer;
    numComponents: number;
    type: GLenum;
    normalize: boolean;
    stride: number;
    offset: number;
};

interface IndexAttribute {
    buffer: WebGLBuffer;
    count: number;
    type: GLenum;
    offset: number;
};

interface RenderObject {
    positions: VertexAttribute;
    colors: VertexAttribute;
    index: IndexAttribute;
};

class Renderer {
    camera: Camera;
    gl: WebGLRenderingContext;
    activeProgram: ShaderProgram;
    loadedObjects: Array<RenderObject>;

    constructor(context: WebGLRenderingContext) {
        this.loadedObjects = [];
        this.gl = context;
        let program = this.loadShaderProgram(`
            attribute vec4 aVertexPosition;
            attribute vec4 aVertexColor;
            uniform mat4 uModelViewMatrix;
            uniform mat4 uProjectionMatrix;
            varying lowp vec4 vColor;
            void main(void) {
                gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
                vColor = aVertexColor;
            }`,`
            varying lowp vec4 vColor;
            void main(void) {
                gl_FragColor = vColor;
            }`
        );
        if(program === null) {
            console.error("Error loading initial program.");
            return;
        }
        this.activeProgram = {
            program: program,
            attribLocations: {
                vertexPosition: this.gl.getAttribLocation(program, 'aVertexPosition'),
                vertexColor: this.gl.getAttribLocation(program, 'aVertexColor'),
            },
            uniformLocations: {
                projectionMatrix: this.gl.getUniformLocation(program, 'uProjectionMatrix'),
                modelViewMatrix: this.gl.getUniformLocation(program, 'uModelViewMatrix'),
            }
        };
        this.gl.clearColor(0.0, 0.0, 0.0, 1.0); // clear canvas to black
        this.gl.clearDepth(1.0); // clear depth buffer
        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.depthFunc(this.gl.LEQUAL); // near things obscure far things

        // camera setup
        this.camera = new Camera(this.gl.canvas.width, this.gl.canvas.height);

        this.setupScene();
    }

    setupScene() {
        // cube verts/colors/indices
        const positions = [
            // Front face
            -1.0, -1.0,  1.0,
             1.0, -1.0,  1.0,
             1.0,  1.0,  1.0,
            -1.0,  1.0,  1.0,
        
            // Back face
            -1.0, -1.0, -1.0,
            -1.0,  1.0, -1.0,
             1.0,  1.0, -1.0,
             1.0, -1.0, -1.0,
        
            // Top face
            -1.0,  1.0, -1.0,
            -1.0,  1.0,  1.0,
             1.0,  1.0,  1.0,
             1.0,  1.0, -1.0,
        
            // Bottom face
            -1.0, -1.0, -1.0,
             1.0, -1.0, -1.0,
             1.0, -1.0,  1.0,
            -1.0, -1.0,  1.0,
        
            // Right face
             1.0, -1.0, -1.0,
             1.0,  1.0, -1.0,
             1.0,  1.0,  1.0,
             1.0, -1.0,  1.0,
        
            // Left face
            -1.0, -1.0, -1.0,
            -1.0, -1.0,  1.0,
            -1.0,  1.0,  1.0,
            -1.0,  1.0, -1.0,
        ];
        const faceColors = [
            [1.0,  1.0,  1.0,  1.0],    // Front face: white
            [1.0,  0.0,  0.0,  1.0],    // Back face: red
            [0.0,  1.0,  0.0,  1.0],    // Top face: green
            [0.0,  0.0,  1.0,  1.0],    // Bottom face: blue
            [1.0,  1.0,  0.0,  1.0],    // Right face: yellow
            [1.0,  0.0,  1.0,  1.0],    // Left face: purple
        ];
        let colors: Array<number> = [];
        for(let i = 0; i < faceColors.length; ++i) {
            const c = faceColors[i];
            colors = colors.concat(c,c,c,c);
        }
        const indices = [
            0,  1,  2,      0,  2,  3,    // front
            4,  5,  6,      4,  6,  7,    // back
            8,  9,  10,     8,  10, 11,   // top
            12, 13, 14,     12, 14, 15,   // bottom
            16, 17, 18,     16, 18, 19,   // right
            20, 21, 22,     20, 22, 23,   // left
        ];
        this.loadObject(positions, colors, indices);
    }

    render() {
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        // setup mvp matrix
        const modelViewMatrix = window.mat4.create();
        const projectionMatrix = window.mat4.create();
        window.mat4.perspective(projectionMatrix, this.camera.fieldOfView, this.camera.aspect, this.camera.zNear, this.camera.zFar);
        window.mat4.translate(modelViewMatrix, modelViewMatrix, [0,0,-6]);

        // render objects
        for(let i = 0; i < this.loadedObjects.length; ++i) {
            let obj = this.loadedObjects[i];
            // load vert positions
            {
                let attr = obj.positions;
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, attr.buffer);
                this.gl.vertexAttribPointer(
                    this.activeProgram.attribLocations.vertexPosition,
                    attr.numComponents,
                    attr.type,
                    attr.normalize,
                    attr.stride,
                    attr.offset);
                this.gl.enableVertexAttribArray(this.activeProgram.attribLocations.vertexPosition);
            }
            // load vert colors
            {
                let attr = obj.colors;
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, attr.buffer);
                this.gl.vertexAttribPointer(
                    this.activeProgram.attribLocations.vertexColor,
                    attr.numComponents,
                    attr.type,
                    attr.normalize,
                    attr.stride,
                    attr.offset);
                this.gl.enableVertexAttribArray(this.activeProgram.attribLocations.vertexColor);
            }
            // load indices and draw
            this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, obj.index.buffer);
            this.gl.useProgram(this.activeProgram.program);
            this.gl.uniformMatrix4fv(this.activeProgram.uniformLocations.projectionMatrix, false, projectionMatrix);
            this.gl.uniformMatrix4fv(this.activeProgram.uniformLocations.modelViewMatrix, false, modelViewMatrix);
            {
                let attr = obj.index;
                this.gl.drawElements(
                    this.gl.TRIANGLES,
                    attr.count,
                    attr.type,
                    attr.offset);
            }
        }
    }

    loadObject(positions: number[], colors: number[], indices: number[]) {
        // vert buffer
        let vertex_buf = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertex_buf);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW);
        // color buffer
        let color_buf = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, color_buf);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(colors), this.gl.STATIC_DRAW);
        // index buffer
        let index_buf = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, index_buf);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), this.gl.STATIC_DRAW);
        this.loadedObjects.push({
            positions: {
                numComponents: 3,
                type: this.gl.FLOAT,
                normalize: false,
                stride: 0,
                offset: 0,
                buffer: vertex_buf
            },
            colors: {
                numComponents: 4,
                type: this.gl.FLOAT,
                normalize: false,
                stride: 0,
                offset: 0,
                buffer: color_buf
            },
            index: {
                buffer: index_buf,
                count: indices.length,
                type: this.gl.UNSIGNED_SHORT,
                offset: 0
            }
        });
    }

    loadShaderProgram(vertexShaderSource: string, fragmentShaderSource: string) : WebGLProgram | null {
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