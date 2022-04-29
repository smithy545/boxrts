import { WebSocketClient } from "./WebSocketClient.js";
import * as constants from "./constants.json";
function main() {
    const canvas = document.getElementById("gameCanvas");
    const gl = canvas.getContext("webgl");
    const config = {
        address: `${location.host}`,
        port: constants["socket_port"]
    };
    const server = new WebSocketClient(config);
    server.open();
    if (gl === null) {
        alert("Unable to initialize WebGL. You browser may not support it.");
        return;
    }
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    setTimeout(() => {
        server.close();
    }, 5000);
}
window.onload = main;
//# sourceMappingURL=main.js.map