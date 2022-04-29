import { WebSocketClient } from "./WebSocketClient.js";
function readJsonFile(path, callback) {
    let xhr = new XMLHttpRequest();
    xhr.overrideMimeType("application/json");
    xhr.onreadystatechange = () => {
        if (xhr.readyState === 4 && xhr.status === 200) {
            callback(xhr);
        }
    };
    xhr.onerror = (e) => {
        console.error(`Could not load file from ${path}\nError: ${e}`);
    };
    xhr.open("GET", path, true);
    xhr.send();
}
function main() {
    const canvas = document.getElementById("gameCanvas");
    const gl = canvas.getContext("webgl");
    if (gl === null) {
        alert("Unable to initialize WebGL. You browser may not support it.");
        return;
    }
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    readJsonFile("./constants.json", (request) => {
        let constants = JSON.parse(request.responseText);
        const config = {
            address: `${location.hostname}`,
            port: constants["socket_port"]
        };
        const conn = new WebSocketClient(config);
        conn.open();
        setTimeout(() => {
            conn.close();
        }, 5000);
    });
}
window.onload = main;
//# sourceMappingURL=main.js.map