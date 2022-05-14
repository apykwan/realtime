const express = require('express');
const cors = require('cors');

const chat = require('./controllers/chat');

require('dotenv').config();
const port = process.env.PORT || 8000;

// app
const app = express();
const server = app.listen(port, console.log(`Server running on port ${port}`));
// const server = require('http').createServer(app);

// socket io
const io = require("socket.io")(server, {
    path: "/socket.io",
    cors: {
      origin: [process.env.DOMAIN],
      methods: ["GET", "POST"],
      allowedHeaders: ["content-type"],
    },
});

// middlewares
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cors());

//socket
chat(io);


