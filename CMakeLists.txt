cmake_minimum_required(VERSION 3.16)
project(boxrts C CXX)

set(CMAKE_CXX_STANDARD 20)

add_subdirectory(external/entt)
add_subdirectory(external/json)
add_subdirectory(external/utils)

set(BUILD_EXAMPLES FALSE)
set(BUILD_TESTS FALSE)
add_subdirectory(external/websocketpp)

include_directories(
.
external/cpp-httplib
external/entt/src
external/json/include
external/utils/include
external/websocketpp
/opt/homebrew/Cellar/boost/1.76.0/include
/opt/homebrew/opt/openssl/include)

link_directories(
/opt/homebrew/Cellar/boost/1.76.0/lib
/opt/homebrew/opt/openssl/lib)

link_libraries(
	EnTT
	nlohmann_json
	utils
	crypto
	ssl
)
add_executable(boxrts
server/main.cpp
server/player.cpp
server/world_server.cpp)
