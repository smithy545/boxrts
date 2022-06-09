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

import { Renderer } from "./Renderer.js";


interface WebSocketConfig {
    address: string;
    port?: number;
};

class GameClient {
    config: WebSocketConfig;
    connection: WebSocket;
    renderer: Renderer;

    constructor(config: WebSocketConfig, renderer: Renderer) {
        this.config = config;
        this.renderer = renderer;
    }

    open(callback?: (ev: Event) => void) {
        console.info("Opening socket connection to server...");
        if(typeof this.config.port !== undefined)
            this.connection = new WebSocket(`ws://${this.config.address}:${this.config.port}`);
        else
            this.connection = new WebSocket(`ws://${this.config.address}`);
        this.connection.addEventListener("open", (event: Event) => {
            console.info("Connection opened...");
            if(callback)
                callback(event);
        });
        this.connection.addEventListener("error", (event: ErrorEvent) => {
            console.error(event);
        });
        this.connection.addEventListener("message", (event: MessageEvent) => {
            console.log(event);
        });
        this.connection.addEventListener("close", (event: CloseEvent) => {
            if(event.wasClean)
                console.info("Connection closed cleanly.");
            else {
                console.error("Connection died:");
                console.error(event);
            }
        });
    }

    close() {
        console.info("Closing socket connections.");
        this.connection.close();
    }
};

export { GameClient, WebSocketConfig };