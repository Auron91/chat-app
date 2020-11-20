//dependencies
const path = require('path')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const Filter = require('bad-words')
const { generateMessage, generateLocationMessage } = require('./utils/messages')
const {addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')


// creating express app
const app = express();
const server = http.createServer(app)
const io = socketio(server)

// constants
const port = process.env.PORT || 3000;
const publicDirPath = path.join(__dirname, '../public')

// Express options
app.use(express.static(publicDirPath))

io.on('connection', (socket) => {
    console.log('New web socket connection')


    socket.on('join', (options , callback) => {

        const {error, user} = addUser({ id: socket.id, ...options})

        if (error) {
            return callback(error)
        }

        socket.join(user.room)

        socket.emit('messageEvent', generateMessage("BocianBOT","Welcome to the chat!"))
        socket.broadcast.to(user.room).emit('messageEvent', generateMessage('BocianBOT',`${user.username} has joined!`))
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        callback()
    })

    socket.on('messageEvent', (message, callback) => {
        const user = getUser(socket.id)
        const filter = new Filter()
        if (filter.isProfane(message)) {
            return callback("Profanity is not allowed!")
        }
        io.to(user.room).emit('messageEvent', generateMessage(user.username, message))
        callback()
    })

    socket.on('sendLocation', (position, callback) => {
        const user = getUser(socket.id)
        io.to(user.room).emit('locationMessageEvent', generateLocationMessage(user.username, position))
        callback()
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if(user) {
            io.to(user.room).emit('messageEvent', generateMessage("BocianBOT",`${user.username} have left the ${user.room} room`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })
})

// Run the server
server.listen(port, () => {
    console.log(`Server is listening on port: ${port}`)
})