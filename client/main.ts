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

import { GameClient } from "./GameClient.js";
import { WebSocketClient, WebSocketConfig } from "./WebSocketClient.js";
import { Renderer } from "./Renderer.js";
import { loadJsonFile } from "./ResourceLoaders.js";


function main() {
    const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
    const gl = canvas.getContext("webgl") as WebGLRenderingContext;
    if(!gl) {
        alert("Unable to initialize WebGL. You browser may not support it.");
        return;
    }

    loadJsonFile("./constants.json", (request: XMLHttpRequest) => {
        const constants = JSON.parse(request.responseText);
        const config: WebSocketConfig = {
            address: `${location.hostname}`,
            port: constants["socket_port"]
        };
        const conn: WebSocketClient = new WebSocketClient(config);
        const renderer = new Renderer(gl);
        const client: GameClient = new GameClient(renderer, conn);
        const loop_body = () => {
            renderer.render();
            window.requestAnimationFrame(loop_body);
        };
        window.requestAnimationFrame(loop_body);
    }, (e: any) => {
        console.error(`Error while loading constants: ${e}`);
    });
}

window.onload = main;