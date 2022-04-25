class WebSocketClient {
    open() {
        console.log("Opening socket connection to server...");
        this.connection = new WebSocket(`ws://${location.hostname}:800`);
        this.connection.onopen = (event) => {
            console.log("Connection opened");
        };
        this.connection.onerror = (event) => {
            console.log("Error: " + event);
        };
        this.connection.onmessage = (event) => {
            console.log("Message: " + event);
        };
    }
    close() {
        console.log("Closing socket connections.");
        this.connection.close();
    }
}
;
export { WebSocketClient };
//# sourceMappingURL=WebSocketClient.js.map