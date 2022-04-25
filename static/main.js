import { WebSocketClient } from "./WebSocketClient.js";
function main() {
    const canvas = document.getElementById("gameCanvas");
    const gl = canvas.getContext("webgl");
    const server = new WebSocketClient();
    server.open();
    if (gl === null) {
        alert("Unable to initialize WebGL. You browser may not support it.");
        return;
    }
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    server.close();
}
window.onload = main;
//# sourceMappingURL=main.js.map