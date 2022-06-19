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


declare var window: any;


interface IndexAttribute {
    count: number;
    type: GLenum;
    offset: number;
};

class InstanceList {
    data: Float32Array;
    count: number;
    buffer: WebGLBuffer;
};

// fucking around with private variables cause why not
class InstancedObject {
    private _instances: InstanceList;
    private _vao: WebGLVertexArrayObject;
    private _index: IndexAttribute
    private _mode: GLenum;
    private _textures: string[];
    private _material: string;

    constructor(vao: WebGLVertexArrayObject, matrixBuffer: WebGLBuffer, mode: GLenum) {
        this._vao = vao;
        this._instances = {
            data: new Float32Array(0),
            count: 0,
            buffer: matrixBuffer
        };
        this._mode = mode;
        this._textures = [];
        this._material = null;
    }

    clone(gl: WebGL2RenderingContext, vao: WebGLVertexArrayObject, matrixBuffer: WebGLBuffer) : InstancedObject {
        const obj = new InstancedObject(vao, matrixBuffer, this._mode);
        if(this._instances.data) {
            obj.addInstance(gl, this._instances.data); // add instance data
            obj._instances.count = this._instances.count; // overwrite count
        }
        return obj;
    }

    get textures() : string[] {
        return this._textures;
    }

    get material() : string {
        return this._material;
    }

    get mode() : GLenum {
        return this._mode;
    }

    set mode(mode: GLenum) {
        this._mode = mode;
    }

    get index() : IndexAttribute {
        return this._index;
    }

    set index(index: IndexAttribute) {
        this._index = index;
    }

    get vao() : WebGLVertexArrayObject {
        return this._vao;
    }

    set vao(vao: WebGLVertexArrayObject) {
        this._vao = vao;
    }

    get instances() : InstanceList {
        return this._instances;
    }

    addInstance(gl: WebGL2RenderingContext, instanceData?: Float32Array) : number {
        if(!instanceData)
            instanceData = new Float32Array(window.mat4.create());
        if(this._instances.data)
            this._instances.data = Float32Array.of(...this._instances.data, ...instanceData);
        else
            this._instances.data = instanceData;
        gl.bindBuffer(gl.ARRAY_BUFFER, this._instances.buffer);
        gl.bufferData(gl.ARRAY_BUFFER, this._instances.data, gl.STATIC_DRAW);
        this._instances.count += 1;
        return this._instances.count - 1;
    }

    modifyInstanceData(gl: WebGL2RenderingContext, instanceIndex: number, instanceData: Float32Array) {
        const offset = 4*4*instanceIndex;
        this._instances.data.set(instanceData, offset);
        gl.bindBuffer(gl.ARRAY_BUFFER, this._instances.buffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, offset * Float32Array.BYTES_PER_ELEMENT, instanceData);
    }

    getInstanceData(instanceIndex: number) : Float32Array {
        const offset = 16*instanceIndex;
        const out = new Float32Array(16);
        for(let i = 0; i < 16; ++i)
            out[i] = this._instances.data[offset + i];
        return out;
    }

    setMaterial(materialName: string) {
        this._material = materialName;
    }

    addTexture(textureName: string) {
        this._textures.push(textureName);
    }
};


export { InstancedObject, InstanceList, IndexAttribute };