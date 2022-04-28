cmake_minimum_required(VERSION 3.16)
project(shapewars C CXX)

set(CMAKE_CXX_STANDARD 20)

add_subdirectory(external/entt)
add_subdirectory(external/fmt)
add_subdirectory(external/json)
add_subdirectory(external/json-schema-validator)
add_subdirectory(external/utils)

include_directories(
.
external/cute_headers
external/entt/src
external/fmt/include
external/freetype/include
external/json/include
external/json-schema-validator/src
external/utils/include
/opt/homebrew/Cellar/boost/1.76.0/include
/opt/homebrew/Cellar/bullet/3.17/include/bullet
/opt/homebrew/opt/openssl/include)

link_directories(
/opt/homebrew/Cellar/boost/1.76.0/lib
/opt/homebrew/Cellar/bullet/3.17/lib
/opt/homebrew/opt/openssl/lib)

link_libraries(
	BulletCollision
	EnTT
	fmt
	nlohmann_json_schema_validator
	utils
	crypto
	ssl
)
add_executable(shapewar
server/main.cpp
server/server.cpp)
