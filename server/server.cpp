#include <boost/beast.hpp>
#include <boost/beast/ssl.hpp>
#include <boost/asio.hpp>
#include <boost/asio/ssl.hpp>
#include <iostream>
#include <server/server.hpp>


namespace beast = boost::beast;
using namespace boost::beast;
using namespace boost::beast::websocket;

namespace shapewar {

WebSocketServer::WebSocketServer(boost::asio::io_context& io_context, unsigned int port)
: m_io_context(io_context),
m_acceptor(io_context, tcp::endpoint(tcp::v4(), port))
{
    listen();
}

void WebSocketServer::listen()
{
    WebSocketConnection::Ptr new_connection = WebSocketConnection::create(m_io_context);
    m_acceptor.async_accept(new_connection->socket(),
        boost::bind(&WebSocketServer::handle_accept, this, new_connection, boost::asio::placeholders::error));
}

void WebSocketServer::handle_accept(WebSocketConnection::Ptr new_connection, const boost::system::error_code& error)
{
    std::cout << "err? " << error.message() << std::endl;
    const std::size_t N = 4096;
    auto& socket = new_connection->socket();
    boost::asio::streambuf buf;
    boost::asio::read_until(socket, buf, "\n");
    std::string line = boost::asio::buffer_cast<const char*>(buf.data());
    std::cout << "recieved:\n" << line << std::endl;
    std::cout << "echoing" << std::endl;
    boost::asio::write(socket, boost::asio::buffer(line));
}

WebSocketConnection::Ptr WebSocketConnection::create(boost::asio::io_context& io_context) {
    return Ptr(new WebSocketConnection(io_context));
}

tcp::socket& WebSocketConnection::socket() {
    return m_socket;
}

void WebSocketConnection::start()
{
    m_message = "test open message";

    boost::asio::async_write(m_socket, boost::asio::buffer(m_message),
        boost::bind(&WebSocketConnection::handle_write, shared_from_this(),
            boost::asio::placeholders::error,
            boost::asio::placeholders::bytes_transferred));
}

WebSocketConnection::WebSocketConnection(boost::asio::io_context& io_context) : m_socket(io_context) {}

void WebSocketConnection::handle_write(const boost::system::error_code& error, std::size_t bytes_transferred) {}

} // namespace shapewar