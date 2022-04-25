#include <boost/beast.hpp>
#include <boost/beast/ssl.hpp>
#include <boost/asio.hpp>
#include <boost/asio/ssl.hpp>
#include <iostream>
#include <server.hpp>


#define PORT 800

namespace net = boost::asio;
namespace beast = boost::beast;
using namespace boost::beast;
using namespace boost::beast::websocket;

net::io_context ioc;
tcp_stream sock(ioc);
net::ssl::context ctx(net::ssl::context::tlsv12);


namespace shapewar {
    WebSocketServer::WebSocketServer(boost::asio::io_context& io_context) : m_io_context(io_context), m_acceptor(io_context, tcp::endpoint(tcp::v4(), PORT)) {
        listen();
    }

    void WebSocketServer::listen() {
        WebSocketConnection::Ptr new_connection = WebSocketConnection::create(m_io_context);
        m_acceptor.async_accept(new_connection->socket(),
            boost::bind(&WebSocketServer::handle_accept, this, new_connection, boost::asio::placeholders::error));
    }

    void WebSocketServer::handle_accept(WebSocketConnection::Ptr new_connection, const boost::system::error_code& error) {
        std::cout << "err? " << error.message() << std::endl;
        const std::size_t N = 4096;
        boost::asio::streambuf buf;
        boost::asio::streambuf::mutable_buffers_type bufs = buf.prepare(N);
        std::size_t bytes_received = new_connection->socket().receive(bufs);
        buf.commit(bytes_received);
        std::istream is(&buf);
        std::string msg;
        is >> msg;
        std::cout << "recieved:\n" << msg << std::endl;
        std::cout << "num bytes: " << bytes_received << std::endl;
    }

    WebSocketConnection::Ptr WebSocketConnection::create(boost::asio::io_context& io_context) {
        return Ptr(new WebSocketConnection(io_context));
    }

    tcp::socket& WebSocketConnection::socket() {
        return m_socket;
    }

    void WebSocketConnection::start() {
        m_message = "test open message";

        boost::asio::async_write(m_socket, boost::asio::buffer(m_message),
            boost::bind(&WebSocketConnection::handle_write, shared_from_this(),
                boost::asio::placeholders::error,
                boost::asio::placeholders::bytes_transferred));
    }

    WebSocketConnection::WebSocketConnection(boost::asio::io_context& io_context) : m_socket(io_context) {}

    void WebSocketConnection::handle_write(const boost::system::error_code& error, std::size_t bytes_transferred) {}
} // namespace shapewar