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

interface RenderState {
    shader: ShaderProgram;
    loadedObjects: InstancedObject[];
};

class Renderer {
    camera: Camera;
    gl: WebGL2RenderingContext;
    state: RenderState;
    instancedFloor: InstancedObject;
    viewMatrix: Float32Array;
    projectionMatrix: Float32Array;

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

        // setup camera and initial rendering matrices
        this.camera = new Camera(0, 0, 0, this.gl.canvas.width, this.gl.canvas.height);
        this.viewMatrix = window.mat4.create();
        window.mat4.translate(this.viewMatrix, this.viewMatrix, this.camera.position);
        this.projectionMatrix = window.mat4.create();
        window.mat4.perspective(this.projectionMatrix, this.camera.fieldOfView, this.camera.aspect, this.camera.zNear, this.camera.zFar);

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
        const colors = [
            1, 0, 0, 1,
            0, 1, 0, 1,
            0, 0, 1, 1,
            1, 0, 1, 1
        ];
        const indices = [0, 1, 2, 2, 3, 1];
        this.instancedFloor = this.createInstancedObject(positions, colors, indices);
        this.instancedFloor.addInstance(this.gl);
        this.instancedFloor.addInstance(this.gl);
    }

    render() {
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        // update view matrix
        window.mat4.lookAt(this.viewMatrix, [
                20,//*Math.cos((new Date()).getTime()/10000),
                20,
                20],//*Math.sin((new Date()).getTime()/10000)],
            [0, 0, 0],
            [0, 1, 0]);
        // update floor pos
        let model = window.mat4.create();
        window.mat4.rotate(model, model, ((new Date()).getTime()/1000), [0,1,0]);
        this.instancedFloor.modifyInstance(this.gl, 0, model);
        model = window.mat4.create();
        window.mat4.translate(model, model, [0, Math.sin((new Date()).getTime()/1000), 0]);
        this.instancedFloor.modifyInstance(this.gl, 1, window.mat4.translate(model, model, [20*Math.cos((new Date()).getTime()/1000), 0, 0]));

        // render objects
        this.gl.useProgram(this.state.shader.program);
        this.gl.uniformMatrix4fv(this.state.shader.uniformLocations.projectionMatrix, false, this.projectionMatrix);
        this.gl.uniformMatrix4fv(this.state.shader.uniformLocations.viewMatrix, false, this.viewMatrix);
        for(let key in this.state.loadedObjects) {
            let obj = this.state.loadedObjects[key];
            this.gl.bindVertexArray(obj.vao);
            this.gl.drawElementsInstanced(this.gl.TRIANGLES, obj.index.count, obj.index.type, obj.index.offset, obj.instances.count);
        }
    }

    createInstancedObject(positions: number[], colors: number[], indices: number[]) : InstancedObject {
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
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, matrix_buf); // don't initialize any instances yet
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