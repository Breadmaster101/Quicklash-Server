const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: { origin: "*" }
});

// Store who the host is for each room
const roomHosts = {};

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // 1. Host creates a room
    socket.on('create_room', (roomCode) => {
        socket.join(roomCode);
        roomHosts[roomCode] = socket.id;
        console.log(`Room ${roomCode} created by ${socket.id}`);
    });

    // 2. Player joins a room
    socket.on('join_room', ({ roomCode, name }) => {
        const hostId = roomHosts[roomCode];
        if (hostId) {
            socket.join(roomCode);
            // Notify the Host that someone joined
            io.to(hostId).emit('player_joined', { id: socket.id, name: name });
        } else {
            socket.emit('error_msg', "Room not found!");
        }
    });

    // 3. Host broadcasts data to all players in the room
    socket.on('host_broadcast', ({ roomCode, data }) => {
        // Send to everyone in room EXCEPT sender (host)
        socket.to(roomCode).emit('game_data', data);
    });

    // 4. Host sends private message to specific player
    socket.on('host_private', ({ targetId, data }) => {
        io.to(targetId).emit('game_data', data);
    });

    // 5. Player sends data to the Host
    socket.on('client_send', ({ roomCode, data }) => {
        const hostId = roomHosts[roomCode];
        if (hostId) {
            // Forward the data to the host, tagging it with the sender's ID
            io.to(hostId).emit('player_data', { id: socket.id, data: data });
        }
    });

    // 6. Handle Disconnect
    socket.on('disconnect', () => {
        // If it was a host, maybe cleanup (optional)
        // If it was a player, you might want to notify host (optional, depends on game logic)
    });
});

http.listen(3000, () => {
    console.log('Listening on *:3000');
});