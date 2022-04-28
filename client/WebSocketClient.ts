interface WebSocketConfig {
    address: string;
    port: number;
}

class WebSocketClient {
    config: WebSocketConfig;

    constructor(config: WebSocketConfig) {
        this.config = config;
    }

    open() {
        console.log("Opening socket connection to server...");
        this.connection = new WebSocket(`ws://${this.config.address}:${this.config.port}`);
        this.connection.onopen = (event: Event) => {
            console.info("Connection opened");
        };
        this.connection.onerror = (event: Event) => {
            console.error(event);
        }
        this.connection.onmessage = (event: MessageEvent) => {
            console.log(event);
        }
    }

    close() {
        console.info("Closing socket connections.");
        this.connection.close();
    }

    connection: WebSocket;
};

export { WebSocketClient, WebSocketConfig };