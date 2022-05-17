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

#ifdef _WIN32
#include <Windows.h>
#else
#include <unistd.h>
#endif
#include <chrono>
#include <server/serialized_event.hpp>
#include <server/world_server.hpp>


using websocketpp::lib::placeholders::_1;
using websocketpp::lib::placeholders::_2;
using websocketpp::lib::bind;

namespace shapewar {

world_server::world_server() {
    m_server.init_asio();

    m_server.set_open_handler(bind(&world_server::on_open, this, ::_1));
    m_server.set_close_handler(bind(&world_server::on_close, this, ::_1));
    m_server.set_message_handler(bind(&world_server::on_message, this, ::_1, ::_2));
    m_server.set_fail_handler(bind(&world_server::on_fail, this, ::_1));

    on<serialized_event>([](serialized_event& ev, world_server& emitter) {
        switch(ev.code) {
            default:
                std::cout << "event code: " << ev.code << std::endl;
                std::cout << "payload: " << ev.payload << std::endl;
        }
    });
}

void world_server::on_open(connection_hdl hdl) {
    std::cout << "open " << &hdl << std::endl;
    m_connections.insert({hdl, player{}});
}

void world_server::on_close(connection_hdl hdl) {
    std::cout << "close " << &hdl << std::endl;
    m_connections.erase(hdl);
}

void world_server::on_message(connection_hdl hdl, world_server::server_base::message_ptr msg) {
    if(m_connections.contains(hdl)) {
        std::string payload = msg->get_payload();
        std::uint16_t code = (payload[0] << 8) & payload[1];
        publish<serialized_event>(code, payload.substr(2, payload.size() - 2));
        return;
    }
    std::cerr << "Message from unkown source" << std::endl;
}

void world_server::on_fail(connection_hdl hdl) {
    std::cerr << "Incoming connection failed" << std::endl;
}

void world_server::run(uint16_t port) {
    std::thread socket_server_thread([&]() {
        try {
            m_server.listen(port);
            m_server.start_accept();
            m_server.run();
        } catch(std::exception& e) {
            std::cerr << "Error on world server: " << e.what() << std::endl;
        }
    });

    auto start_time = std::chrono::high_resolution_clock::now();
    unsigned long long dt_ns{0};
    for(;;) {
        auto frame_start = std::chrono::high_resolution_clock::now();

        // do stuff
        sleep(1);

        auto frame_end = std::chrono::high_resolution_clock::now();
        dt_ns = std::chrono::duration_cast<std::chrono::nanoseconds>(frame_end - frame_start).count();
        for(auto [hdl, player]: m_connections)
            m_server.send(hdl, std::to_string(dt_ns), websocketpp::frame::opcode::TEXT);
    }

    socket_server_thread.join();
}

} // namespace shapewar