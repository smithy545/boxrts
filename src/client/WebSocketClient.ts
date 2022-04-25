class WebSocketClient {
    open() {
        console.log("Opening socket connection to server...");
        this.connection = new WebSocket(`ws://${location.hostname}:800`);
        this.connection.onopen = (event: Event) => {
            console.log("Connection opened");
        };
        this.connection.onerror = (event: Event) => {
            console.log("Error: " + event);
        }
        this.connection.onmessage = (event: MessageEvent) => {
            console.log("Message: " + event);
        }
    }

    close() {
        console.log("Closing socket connections.");
        this.connection.close();
    }

    connection: WebSocket;
};

export { WebSocketClient };