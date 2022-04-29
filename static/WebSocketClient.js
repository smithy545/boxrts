class WebSocketClient {
    constructor(config) {
        this.config = config;
    }
    open() {
        console.log("Opening socket connection to server...");
        if (this.config.port !== null)
            this.connection = new WebSocket(`ws://${this.config.address}:${this.config.port}`);
        else
            this.connection = new WebSocket(`ws://${this.config.address}`);
        this.connection.addEventListener("open", (event) => {
            console.info("Connection opened");
            this.connection.send("test hello");
        });
        this.connection.addEventListener("error", (event) => {
            console.error(event);
        });
        this.connection.addEventListener("message", (event) => {
            console.log(event);
        });
        this.connection.addEventListener("close", (event) => {
            if (event.wasClean) {
                console.info("Connection closed cleanly.");
            }
            else {
                console.error("Connection died.");
                console.error(event);
            }
        });
    }
    close() {
        console.info("Closing socket connections.");
        this.connection.close();
    }
}
;
export { WebSocketClient };
//# sourceMappingURL=WebSocketClient.js.map