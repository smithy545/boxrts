all: client server

client: client/*
	tsc

server: server/*
	cmake -S . -B build && cd build && make

test:
	yarn run live-server

clean:
	rm -fr build && rm static/*.js.*
