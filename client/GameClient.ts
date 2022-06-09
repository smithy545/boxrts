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

import { MessageRouter } from "./MessageRouter.js";


interface WebSocketConfig {
    address: string;
    port?: number;
};

class GameClient {
    config: WebSocketConfig;
    connection: WebSocket | null;
    router: MessageRouter;

    constructor(config: WebSocketConfig) {
        this.config = config;
        this.connection = null;
        this.router = new MessageRouter();
    }

    handleMessage(event: MessageEvent) {
        let response = this.router.routeMessage(event);
        if(response !== null)
            this.connection.send(response);
    }

    handleError(event: ErrorEvent) {
        let response = this.router.routeError(event);
        if(response !== null)
            this.connection.send(response);
    }

    isOpen() {
        return this.connection !== null;
    }

    open(callback?: (ev: Event) => void) {
        console.info("Opening WebSocket connection...");
        let urlString = `ws://${this.config.address}`;
        if(this.config.port !== undefined)
            urlString = `${urlString}:${this.config.port}`;
        this.connection = new WebSocket(urlString);
        this.connection.addEventListener("open", (event: Event) => {
            console.info("WebSocket opened.");
            if(callback)
                callback(event);
        });
        this.connection.addEventListener("close", (event: CloseEvent) => {
            if(event.wasClean)
                console.info("WebSocket closed cleanly.");
            else {
                console.error("WebSocket closed unexpectedly:");
                console.error(event);
            }
            this.connection = null;
        });
        this.connection.addEventListener("message", this.handleMessage.bind(this));
        this.connection.addEventListener("error", this.handleError.bind(this));
    }

    close() {
        console.info("Closing socket connections.");
        this.connection.close();
    }
};

export { GameClient, WebSocketConfig };