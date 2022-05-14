const users = [];

const addUser = username => {
    const name = username.trim().toLowerCase();
    const existingUser = users.find(user => user === name);

    if (!username) return { error: 'Name is required!!' };
    if (existingUser) return { error: 'Name is taken!!' };

    users.push(name);
    return username;
}

const chat = io => {
    // middleware
    io.use((socket, next) => {
        const username = socket.handshake.auth.username;
        // console.log('username on handshake', username)
        if (!username) return next(new Error('Invalid unsername'));
        
        socket.username = username;
        next();
    });

    io.on('connection', socket => {
        // socket.on('username', (username, next) => {
            
        //     let result = addUser(username);
        //     if (result.error) return next(result.error);

        //     // emit the list of users
        //     io.emit('users', users);

        //     // broadcast to other users except the current user
        //     socket.broadcast.emit('user joined', `${username} has joined us!`);
        // });

        let users = [];
        for (let [id, socket] of io.of("/").sockets) {
            const existingUser = users.find(user => user.username === socket.username);

            if (existingUser) {
                socket.emit("username taken");
                socket.disconnect();
                return;
            }
            
            users.push({
                userID: id,
                username: socket.username
            });
        }

        socket.emit("users", users);

        // when a new user joins, notify the existing users
        socket.broadcast.emit("user connected", {
            userID: socket.id,
            username: socket.username
          });

        socket.on('message', message => {
            io.emit('message', message);
        });

        socket.on("typing", (username) => {
            socket.broadcast.emit("typing", `${username} is typing...`);
        });

        socket.on("private message", ({ message, to }) => {
            console.log(message, to)
            socket.to(to).emit("private message", {
              message,
              from: socket.id,
            });
        });

        socket.on('disconnect', () => {
            socket.broadcast.emit('user disconnected', socket.id);
        });
    });
}

module.exports = chat;