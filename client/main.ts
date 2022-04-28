import { WebSocketClient, WebSocketConfig } from "./WebSocketClient.js";
import * as constants from "./constants.json";

function main() {
    const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
    const gl = canvas.getContext("webgl") as WebGLRenderingContext;
    const config_file = `${location.hostname}`
    const config: WebSocketConfig = {
        address: `${location.hostname}`,
        port: constants["port"]
    };
    const server: WebSocketClient = new WebSocketClient(config);
    server.open();

    if(gl === null) {
        alert("Unable to initialize WebGL. You browser may not support it.");
        return;
    }

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    server.close();
}

window.onload = main;