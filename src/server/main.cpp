#include <boost/asio.hpp>
#include <iostream>
#include <server.hpp>
#include <thread>


using namespace shapewar;

int main() {
    std::cout << "start" << std::endl;

    try {
        boost::asio::io_context io_context;
        WebSocketServer server(io_context);
        io_context.run();
    } catch(std::exception& e) {
        std::cerr << e.what() << std::endl;
    }

    std::cout << "end" << std::endl;
}
