#ifndef SHAPEWAR_SERVER_H
#define SHAPEWAR_SERVER_H

#include <boost/asio.hpp>
#include <boost/bind.hpp>
#include <utils/macros.h>


using boost::asio::ip::tcp;

namespace shapewar {

class WebSocketConnection : public std::enable_shared_from_this<WebSocketConnection> {
public:
    PTR(WebSocketConnection);

    static Ptr create(boost::asio::io_context& io_context);

    tcp::socket& socket();

    void start();
private:
    tcp::socket m_socket;
    std::string m_message;

    WebSocketConnection(boost::asio::io_context& io_context);

    void handle_write(const boost::system::error_code& error, std::size_t bytes_transferred);
};

class WebSocketServer {
public:
    WebSocketServer(boost::asio::io_context& io_context, unsigned int port);
private:
    boost::asio::io_context& m_io_context;
    tcp::acceptor m_acceptor;

    void listen();

    void handle_accept(WebSocketConnection::Ptr new_connection, const boost::system::error_code& error);
};

} // namespace shapewar

#endif //SHAPEWAR_SERVER_H
