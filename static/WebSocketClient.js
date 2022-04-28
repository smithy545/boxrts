class WebSocketClient {
    constructor(config) {
        this.config = config;
    }
    open() {
        console.log("Opening socket connection to server...");
        this.connection = new WebSocket(`ws://${this.config.address}:${this.config.port}`);
        this.connection.onopen = (event) => {
            console.info("Connection opened");
        };
        this.connection.onerror = (event) => {
            console.error(event);
        };
        this.connection.onmessage = (event) => {
            console.log(event);
        };
    }
    close() {
        console.info("Closing socket connections.");
        this.connection.close();
    }
}
;
export { WebSocketClient };
//# sourceMappingURL=WebSocketClient.js.map