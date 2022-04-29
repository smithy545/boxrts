/*
MIT License

Copyright (c) 2022 Philip Arturo Smith

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

#include <chrono>
#include <httplib.h>
#include <iostream>
#include <fstream>
#include <nlohmann/json.hpp>
#include <server/websocket_server.hpp>
#include <server/world.hpp>
#include <thread>


using namespace shapewar;

int main() {
    std::cout << "Reading config..." << std::endl;

    // default config values
    unsigned int http_port = 8080;
    unsigned int socket_port = 8080;
    try {
        std::ifstream constants_stream("./static/constants.json");
        nlohmann::json constants_json = nlohmann::json::parse(constants_stream);
        http_port = constants_json["http_port"];
        socket_port = constants_json["socket_port"];
    } catch(std::exception& e) {
        std::cerr << "Error reading config: " << e.what() << std::endl;
        return -1;
    }

    std::cout << "Starting static file server on " << http_port << std::endl;
    std::thread http_server_thread([http_port]() {
        try {
            httplib::Server http_server;
            if(!http_server.set_mount_point("/", "./static"))
                std::cerr << "Error mounting static file directory. Make sure specified directory exists." << std::endl;
            else
                http_server.listen("0.0.0.0", http_port);
        } catch(std::exception& e) {
            std::cerr << "Error on http server: " << e.what() << std::endl;
        }
    });

    // load world
    auto world_ptr = std::make_shared<world>();
    std::cout << "Starting socket server on " << socket_port << std::endl;
    std::thread socket_server_thread([socket_port, world_ptr]() {
        try {
            websocket_server socket_server(world_ptr);
            socket_server.run(socket_port);
        } catch(std::exception& e) {
            std::cerr << "Error on websocket server: " << e.what() << std::endl;
        }
    });

    std::cout << "Starting world thread..." << std::endl;
    std::thread world_thread([world_ptr]() {
        auto start_time = std::chrono::high_resolution_clock::now();
        world::ns dt_ns{0};
        for(;;) {
            auto frame_start = std::chrono::high_resolution_clock::now();
            world_ptr->update(dt_ns);
            auto frame_end = std::chrono::high_resolution_clock::now();
            dt_ns = std::chrono::duration_cast<std::chrono::nanoseconds>(frame_end - frame_start).count();
        }
    });

    socket_server_thread.join();
    http_server_thread.join();
    world_thread.join();

    std::cout << "End." << std::endl;
    return 0;
}
