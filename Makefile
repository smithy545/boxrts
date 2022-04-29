all: client server

client: client/*
	tsc

server: server/*
	cmake -S . -B build && cd build && make

test: client server
	build/shapewar

clean:
	rm -fr build && rm static/*.js && rm static/*.js.*
