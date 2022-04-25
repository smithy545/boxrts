client:
	tsc

server:
	cmake -S . -B build && cd build && make

all: client server