#include <boost/asio.hpp>
#include <iostream>
#include <fstream>
#include <nlohmann/json.hpp>
#include <server/server.hpp>


int main() {
    std::cout << "reading config" << std::endl;

    std::ifstream constants_stream("/Users/philipsmith/Documents/geomwars/static/constants.json");
    nlohmann::json constants_json = nlohmann::json::parse(constants_stream);
    unsigned int port = constants_json["port"];

    std::cout << "starting socket server on " << port << std::endl;

    try {
        boost::asio::io_context io_context;
        shapewar::WebSocketServer server(io_context, port);
        io_context.run();
    } catch(std::exception& e) {
        std::cerr << e.what() << std::endl;
    }

    std::cout << "end" << std::endl;
}
