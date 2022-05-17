cmake_minimum_required(VERSION 3.16)
project(shapewar C CXX)

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
/opt/homebrew/Cellar/bullet/3.17/include/bullet
/opt/homebrew/opt/openssl/include)

link_directories(
/opt/homebrew/Cellar/boost/1.76.0/lib
/opt/homebrew/Cellar/bullet/3.17/lib
/opt/homebrew/opt/openssl/lib)

link_libraries(
	EnTT
	nlohmann_json
	utils
	crypto
	ssl
	LinearMath
	BulletCollision
	BulletDynamics
)
add_executable(shapewar
server/main.cpp
server/world_server.cpp)
