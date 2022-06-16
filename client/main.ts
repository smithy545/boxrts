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
import { MainLoop } from "./MainLoop.js";
import { Renderer } from "./Renderer.js";
import { loadImageFile, loadFile } from "./ResourceLoaders.js";


function main() {
    const container = document.getElementById("gameDiv") as HTMLDivElement;
    const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
    // set to screen size so scaling works properly even if canvas is smaller than full screen
    canvas.width = window.screen.width;
    canvas.height = window.screen.height;
    const gl = canvas.getContext("webgl2") as WebGL2RenderingContext;
    if(!gl) {
        alert("Unable to initialize WebGL2. You browser may not support it.");
        return;
    }
    const renderer = new Renderer(gl);

    // setup resize handling
    window.addEventListener("resize", (ev: UIEvent) => {
        renderer.resize();
    });

    // load bootstrap info
    loadFile("./json/bootstrap.json", (request: XMLHttpRequest) => {
        console.info("Bootstrap json loaded.");
        const constants = JSON.parse(request.responseText);

        // load object model files
        const objectFileStatus: {[filename: string]: boolean} = {};
        for(let i = 0; i < constants["object_files"].length; i++) {
            const path: string = constants["object_files"][i];
            objectFileStatus[path] = false;
            console.info(`Requesting obj file: ${path}`)
            loadFile(`./objects/${path}`, (req: XMLHttpRequest) => {
                objectFileStatus[path] = true;
                console.info(`Object loaded at ${path}:`);
                renderer.parseAndLoadObj(req.responseText);
            }, (ev) => {
                console.error(ev);
            }, "application/obj");
        }

        // load image files to textures
        const imageFileStatus: {[filename: string]: boolean} = {};
        for(let i = 0; i < constants["image_files"].length; i++) {
            const path: string = constants["image_files"][i];
            imageFileStatus[path] = false;
            console.info(`Requesting img file: ${path}`)
            loadImageFile(`./images/${path}`, (img: HTMLImageElement) => {
                imageFileStatus[path] = true;
                console.info(`Image loaded at ${path}`);
                const pathRegex = /(.*\/)*(.+)\.png/;
                const matches = path.match(pathRegex);
                if(matches !== null) {
                    const location = matches[1];
                    const name = matches[2];
                    if(name.endsWith("tilesheet"))
                        renderer.loadTilesheet(name, img);
                    else if(name.endsWith("spritesheet"))
                        renderer.loadSpritesheet(name, img);
                    else
                        renderer.loadTexture(name, img);
                } else
                    console.error("Image file type not supported");
            });
        }

        // open connection and start game loop on successful connect
        const config: WebSocketConfig = {
            address: `${location.hostname}`,
            port: constants["socket_port"]
        };
        const client: GameClient = new GameClient(config);
        client.open((ev: Event) => {
            // Load singletons
            const controller = new CameraController(renderer.camera, canvas);
            const mainLoop = new MainLoop();
            mainLoop.addTicker(controller);
            client.router.registerCallback(1, (data: string) => {
                let buf = new ArrayBuffer(1);
                let view = new Int8Array(buf);
                view[0] = 33; // send '!'
                return buf;
            });

            let previousTimestamp: DOMHighResTimeStamp = 0;
            const tick = (timestamp: DOMHighResTimeStamp) => {
                let elapsed = timestamp - previousTimestamp;

                mainLoop.tick(elapsed);
                renderer.render(elapsed);

                previousTimestamp = timestamp;
                window.requestAnimationFrame(tick);
            };

            console.info("Intitializing renderer...");
            // load initial shader
            renderer.loadShaderProgram("color", true);
            const wait = (cond: () => boolean, success: () => void, interval: number) => {
                setTimeout(()=>{
                    console.info("...");
                    if(cond())
                        success();
                    else
                        wait(cond, success, interval);
                }, interval);
            };
            wait(() => {
                return renderer.ready;
            }, () => {
                console.info("Renderer initialized. Starting game loop.");
                renderer.setupScene();
                window.requestAnimationFrame(tick);
            }, 1000);
        });
    }, (e: any) => {
        console.error("Error while loading constants:");
        console.error(e);
        alert("Error during initialization. Cannot start game.");
    }, "application/json");
}

window.onload = main;