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

#include <server/websocket_server.hpp>


using websocketpp::lib::placeholders::_1;
using websocketpp::lib::placeholders::_2;
using websocketpp::lib::bind;

namespace shapewar {

websocket_server::websocket_server() {
    m_server.init_asio();

    m_server.set_open_handler(bind(&websocket_server::on_open,this,::_1));
    m_server.set_close_handler(bind(&websocket_server::on_close,this,::_1));
    m_server.set_message_handler(bind(&websocket_server::on_message,this,::_1,::_2));
}

void websocket_server::on_open(connection_hdl hdl) {
    m_connections.insert(hdl);
}

void websocket_server::on_close(connection_hdl hdl) {
    m_connections.erase(hdl);
}

void websocket_server::on_message(connection_hdl hdl, websocket_server::server_base::message_ptr msg) {
    for (auto it : m_connections) {
        m_server.send(it,msg);
    }
}

void websocket_server::run(uint16_t port) {
    m_server.listen(port);
    m_server.start_accept();
    m_server.run();
}

} // namespace shapewar