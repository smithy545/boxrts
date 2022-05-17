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

class Renderer {
    gl: WebGLRenderingContext;
    activeProgram: WebGLProgram;
    buffers: Array<WebGLBuffer>;
    vertexAttribArrays: Int8Array;
    cubeRotation: number;

    constructor(context: WebGLRenderingContext) {
        this.cubeRotation = 0.0;
        this.buffers = [];
        this.gl = context;
        this.activeProgram = this.loadShaderProgram(`
            attribute vec4 aVertexPosition;
            attribute vec4 aVertexColor;
            uniform mat4 uModelViewMatrix;
            uniform mat4 uProjectionMatrix;
            varying lowp vec4 vColor;
            void main(void) {
            gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
            vColor = aVertexColor;
            }
        `, `
        varying lowp vec4 vColor;
        void main(void) {
            gl_FragColor = vColor;
        }
        `);
        
        this.gl.clearColor(0.0, 0.0, 0.0, 1.0); // clear to black
        this.gl.clearDepth(1.0); // clear depth
        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.depthFunc(this.gl.LEQUAL); // near things obscure far things

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
        let buf = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buf);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW);
        this.buffers.push(buf);

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
        buf = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buf);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(colors), this.gl.STATIC_DRAW);
        this.buffers.push(buf);

        buf = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, buf);
        const indices = [
            0,  1,  2,      0,  2,  3,    // front
            4,  5,  6,      4,  6,  7,    // back
            8,  9,  10,     8,  10, 11,   // top
            12, 13, 14,     12, 14, 15,   // bottom
            16, 17, 18,     16, 18, 19,   // right
            20, 21, 22,     20, 22, 23,   // left
        ];
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), this.gl.STATIC_DRAW);
        this.buffers.push(buf);

    }

    render(mat4: any) {
        // clear screen
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        // setup mvp matrix
        const fieldOfView = 45 * Math.PI / 180;   // in radians
        const aspect = this.gl.canvas.clientWidth / this.gl.canvas.clientHeight;
        const zNear = 0.1;
        const zFar = 100.0;
        const projectionMatrix = mat4.create();
        mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);
        const modelViewMatrix = mat4.create();
        mat4.translate(modelViewMatrix, modelViewMatrix, [-0.0,0.0,-6.0]);
        mat4.rotate(modelViewMatrix, modelViewMatrix, this.cubeRotation, [0,0,1]);
        mat4.rotate(modelViewMatrix, modelViewMatrix, this.cubeRotation * 0.7, [0,1,0]);

        // shader info
        const programInfo = {
            program: this.activeProgram,
            attribLocations: {
              vertexPosition: this.gl.getAttribLocation(this.activeProgram, 'aVertexPosition'),
              vertexColor: this.gl.getAttribLocation(this.activeProgram, 'aVertexColor'),
            },
            uniformLocations: {
              projectionMatrix: this.gl.getUniformLocation(this.activeProgram, 'uProjectionMatrix'),
              modelViewMatrix: this.gl.getUniformLocation(this.activeProgram, 'uModelViewMatrix'),
            }
        };
        // load verts
        {
            const numComponents = 3;
            const type = this.gl.FLOAT;
            const normalize = false;
            const stride = 0;
            const offset = 0;
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers[0]);
            this.gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition,
                numComponents, type, normalize, stride, offset);
            this.gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
        }
        // load vert colors
        {
            const numComponents = 4;
            const type = this.gl.FLOAT;
            const normalize = false;
            const stride = 0;
            const offset = 0;
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers[1]);
            this.gl.vertexAttribPointer(programInfo.attribLocations.vertexColor,
            numComponents, type, normalize, stride, offset);
            this.gl.enableVertexAttribArray(programInfo.attribLocations.vertexColor);
        }
        // load indices and draw
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.buffers[2]);
        this.gl.useProgram(this.activeProgram);
        this.gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
        this.gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);
        {
            const vertexCount = 36;
            const type = this.gl.UNSIGNED_SHORT;
            const offset = 0;
            this.gl.drawElements(this.gl.TRIANGLES, vertexCount, type, offset);
        }
        this.cubeRotation += 0.001;
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