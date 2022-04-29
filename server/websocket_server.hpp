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

#ifndef SHAPEWAR_WEBSOCKET_SERVER_H
#define SHAPEWAR_WEBSOCKET_SERVER_H

#include <set>
#include <websocketpp/config/asio_no_tls.hpp>
#include <websocketpp/server.hpp>


using websocketpp::connection_hdl;

namespace shapewar {

class websocket_server {
public:
    typedef websocketpp::server<websocketpp::config::asio> server_base;

    websocket_server();

    void on_open(connection_hdl hdl);

    void on_close(connection_hdl hdl);

    void on_message(connection_hdl hdl, server_base::message_ptr msg);

    void run(uint16_t port);
private:
    typedef std::set<connection_hdl,std::owner_less<connection_hdl>> con_list;

    server_base m_server;
    con_list m_connections;
};

} // namespace shapewar

#endif //SHAPEWAR_WEBSOCKET_SERVER_H
