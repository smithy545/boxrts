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

import { CameraController } from "./CameraController.js";
import { GameClient, WebSocketConfig } from "./GameClient.js";
import { Renderer } from "./Renderer.js";
import { loadImageFile, loadJsonFile, loadObjectFile } from "./ResourceLoaders.js";


function main() {
    const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
    const gl = canvas.getContext("webgl2") as WebGL2RenderingContext;
    if(!gl) {
        alert("Unable to initialize WebGL2. You browser may not support it.");
        return;
    }

    loadJsonFile("./constants.json", (request: XMLHttpRequest) => {
        console.info("Bootstrap json loaded.");
        const constants = JSON.parse(request.responseText);
        const renderer = new Renderer(gl);

        // load object files
        const objectFileStatus: {[filename: string]: boolean} = {};
        for(let i = 0; i < constants["object_files"].length; i++) {
            let path = constants["object_files"][i];
            objectFileStatus[path] = false;
            console.info(`Requesting obj file: ${path}`)
            loadObjectFile(`./${path}`, (req: XMLHttpRequest) => {
                objectFileStatus[path] = true;
                console.info(`Object loaded at ${path}:`);
                // debug: console.info(req.response);
                // TODO: Load object files to renderer
            });
        }
        // load image files
        const imageFileStatus: {[filename: string]: boolean} = {};
        for(let i = 0; i < constants["image_files"].length; i++) {
            let path = constants["image_files"][i];
            imageFileStatus[path] = false;
            console.info(`Requesting img file: ${path}`)
            loadImageFile(`./${path}`, (img: HTMLImageElement) => {
                imageFileStatus[path] = true;
                console.info(`Image loaded at ${path}`);
                // TODO: Load image files into textures
            });
        }

        // open connection and start game loop on successful connect
        const config: WebSocketConfig = {
            address: `${location.hostname}`,
            port: constants["socket_port"]
        };
        const client: GameClient = new GameClient(config, renderer);
        client.open((ev: Event) => {
            client.connection.send("HI");
            
            // Load singletons
            const controller: CameraController = new CameraController(renderer.camera, canvas);

            const loop_body = () => {
                renderer.render();
                window.requestAnimationFrame(loop_body);
            };
            window.requestAnimationFrame(loop_body);
        });
    }, (e: any) => {
        console.error(`Error while loading constants: ${e}`);
    });
}

window.onload = main;