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

    addInstance(gl: WebGL2RenderingContext, instanceData?: Float32Array) {
        if(!instanceData)
            instanceData = new Float32Array(window.mat4.create());
        if(this.instances.data) {
            this.instances.data = Float32Array.of(...this.instances.data, ...instanceData);
        } else {
            this.instances.data = instanceData;
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.instances.buffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.instances.data, gl.STATIC_DRAW);
        this.instances.count += 1;
    }

    modifyInstance(gl: WebGL2RenderingContext, instanceIndex: number, instanceData: Float32Array) {
        let offset = 4*4*instanceIndex;
        this.instances.data.set(instanceData, offset);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.instances.buffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, offset * Float32Array.BYTES_PER_ELEMENT, instanceData);
    }
};

interface RenderState {
    shader: ShaderProgram;
    loadedObjects: InstancedObject[];
};

class Renderer {
    camera: Camera;
    gl: WebGL2RenderingContext;
    state: RenderState;

    constructor(context: WebGL2RenderingContext) {
        this.gl = context;
        let program = this.loadShaderProgram(`attribute vec3 aVertexPosition;
            attribute vec4 aVertexColor;
            attribute mat4 aInstanceMatrix;
            uniform mat4 uViewMatrix;
            uniform mat4 uProjectionMatrix;
            varying lowp vec4 vColor;
            void main(void) {
                gl_Position = uProjectionMatrix * uViewMatrix * aInstanceMatrix * vec4(aVertexPosition, 1);
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
        this.state = {
            shader: {
                program: program,
                attribLocations: {
                    vertexPosition: this.gl.getAttribLocation(program, 'aVertexPosition'),
                    vertexColor: this.gl.getAttribLocation(program, 'aVertexColor'),
                    instanceMatrix: this.gl.getAttribLocation(program, 'aInstanceMatrix')
                },
                uniformLocations: {
                    projectionMatrix: this.gl.getUniformLocation(program, 'uProjectionMatrix'),
                    viewMatrix: this.gl.getUniformLocation(program, 'uViewMatrix'),
                }
            },
            loadedObjects: []
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
        // floor verts/colors/indices
        const positions = [
            -10, 0, -10,
            -10, 0, 10,
            10, 0, -10,
            10, 0, 10
        ];
        let colors: number[] = [];
        for(let i = 0; i < positions.length/3; ++i) {
            colors = colors.concat(1,1,1,1);
        }
        const indices = [0, 1, 2, 2, 3, 1];
        let instanced_floor = this.loadObject(positions, colors, indices);
        let model = window.mat4.create();
        instanced_floor.addInstance(this.gl);
        instanced_floor.modifyInstance(this.gl, 0, window.mat4.translate(model, model, [-15, 0, 0]));
        instanced_floor.addInstance(this.gl);
        instanced_floor.modifyInstance(this.gl, 1, window.mat4.translate(model, window.mat4.create(), [15, 0, 0]));
    }

    render() {
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        // setup mvp matrix
        const viewMatrix = window.mat4.create();
        const projectionMatrix = window.mat4.create();
        window.mat4.perspective(projectionMatrix, this.camera.fieldOfView, this.camera.aspect, this.camera.zNear, this.camera.zFar);
        window.mat4.lookAt(viewMatrix, [
                20*Math.cos((new Date()).getTime()/10000),
                20,
                20*Math.sin((new Date()).getTime()/10000)],
            [0, 0, 0],
            [0, 1, 0]);

        // render objects
        this.gl.useProgram(this.state.shader.program);
        this.gl.uniformMatrix4fv(this.state.shader.uniformLocations.projectionMatrix, false, projectionMatrix);
        this.gl.uniformMatrix4fv(this.state.shader.uniformLocations.viewMatrix, false, viewMatrix);
        for(let key in this.state.loadedObjects) {
            let index = this.state.loadedObjects[key].index;
            this.gl.bindVertexArray(this.state.loadedObjects[key].vao);
            this.gl.drawElementsInstanced(this.gl.TRIANGLES, index.count, index.type, index.offset, this.state.loadedObjects[key].instances.count);
        }
    }

    loadObject(positions: number[], colors: number[], indices: number[]) : InstancedObject {
        let vao = this.gl.createVertexArray();
        this.gl.bindVertexArray(vao);

        let vertex_buf = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertex_buf);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW);
        this.gl.vertexAttribPointer(this.state.shader.attribLocations.vertexPosition, 3, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(this.state.shader.attribLocations.vertexPosition);

        let color_buf = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, color_buf);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(colors), this.gl.STATIC_DRAW);
        this.gl.vertexAttribPointer(this.state.shader.attribLocations.vertexColor, 4, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(this.state.shader.attribLocations.vertexColor);

        let matrix_buf = this.gl.createBuffer();
        let vec4Size = 4 * Float32Array.BYTES_PER_ELEMENT;
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, matrix_buf);
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

        let index_buf = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, index_buf);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), this.gl.STATIC_DRAW);

        console.log(this.state);

        let builtObject = new InstancedObject(vao, matrix_buf);
        builtObject.index = {
            count: indices.length,
            type: this.gl.UNSIGNED_SHORT,
            offset: 0
        };
        this.state.loadedObjects.push(builtObject);
        return builtObject;
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