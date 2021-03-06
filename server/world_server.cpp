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
#include <server/player.hpp>
#include <server/world_server.hpp>


using websocketpp::lib::placeholders::_1;
using websocketpp::lib::placeholders::_2;
using websocketpp::lib::bind;

namespace boxrts {

WorldServer::WorldServer() {
    m_server.init_asio();
    m_server.set_open_handler(bind(&WorldServer::on_open, this, ::_1));
    m_server.set_close_handler(bind(&WorldServer::on_close, this, ::_1));
    m_server.set_message_handler(bind(&WorldServer::on_message, this, ::_1, ::_2));
    m_server.set_fail_handler(bind(&WorldServer::on_fail, this, ::_1));
}

WorldServer::~WorldServer() {}

void WorldServer::run(uint16_t port) {
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
        sleep(5);
        for(auto [hdl, entity]: m_connections) {
            auto& player = m_registry.get<Player>(entity);
            m_server.send(hdl, player.get_frame_data(), websocketpp::frame::opcode::TEXT);
        }
        auto frame_end = std::chrono::high_resolution_clock::now();
        dt_ns = std::chrono::duration_cast<std::chrono::nanoseconds>(frame_end - frame_start).count();
    }

    socket_server_thread.join();
}

void WorldServer::on_open(connection_hdl hdl) {
    auto entity = m_registry.create();
    m_registry.emplace_or_replace<Player>(entity);
    m_registry.emplace_or_replace<connection_hdl>(entity, hdl);
    m_connections.insert({hdl, entity});
}

void WorldServer::on_close(connection_hdl hdl) {
    auto entity = m_connections[hdl];
    m_connections.erase(hdl);
    m_registry.destroy(entity);
}

void WorldServer::on_message(connection_hdl hdl, WorldServer::server_base::message_ptr msg) {
    if(m_connections.contains(hdl)) {
        return;
    }
    std::cerr << "Message from unknown source" << std::endl;
}

void WorldServer::on_fail(connection_hdl hdl) {
    std::cerr << "Incoming connection failed" << std::endl;
}

} // namespace boxrts