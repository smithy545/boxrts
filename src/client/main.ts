import { WebSocketClient } from "./WebSocketClient.js";

function main() {
    const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
    const gl = canvas.getContext("webgl") as WebGLRenderingContext;
    const server: WebSocketClient = new WebSocketClient();
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