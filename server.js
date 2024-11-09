const { Server } = require('socket.io');
const express = require('express');
const cors = require('cors');
const { createServer } = require('node:http');

const app = express();
app.use(cors());
const server = createServer(app);
const port = process.env.PORT || 8080;
const httpserver = server.listen(8080);
const io = new Server(httpserver, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});
console.log("SERVER STARTED!!!")
const clients = new Map();
const paired = new Map();
let count = 0;

const curseWords = ["badword1","ass", "badword2", "badword3","fuck","nigga","fucker","asshole","cunt","whore","nigga","hoe","Bastard","Shit","Bitch","Dick","Pussy","son of a bitch","Mother Fucker","bloody","Cock","dumb"];

function censorMessage(message) {
    // Constructing a regular expression pattern from the curseWords array
    const pattern = new RegExp(curseWords.join("|"), "gi");
    // Replace any occurrence of curse words with asterisks of the same length
    return message.replace(pattern, match => "*".repeat(match.length));
}

io.on("connection", (socket) => {
    console.log("Got a Client");
    socket.on("username", (data) => {
        count++;
        socket.emit("my_username", data);
        clients.set(socket, data);
        let parent = [];
        setTimeout(() => {
            console.log("Searching...");
            const condition = (client) => client !== socket && !paired.has(client);
            let partners = Array.from(clients).filter(([key, value]) => condition(key)).map(([key, value]) => key);
            if (paired.has(socket)) {
                // socket already paired
            } else if (partners.length === 0) {
                socket.emit("got_username", "NO ONE CAUSE NOT ENOUGH CLIENTS ARE PRESENT");
            } else {
                const partner_index = Math.floor(Math.random() * partners.length);
                const partner = partners[partner_index];
                if (!paired.has(partner) && !paired.has(socket)) {
                    console.log("GOT A PARTNER!!ENJOY YOUR CHAT");
                    paired.set(socket, partner);
                    paired.set(partner, socket);
                    partner.emit("got_username", data);
                    socket.emit("got_username", clients.get(partner));
                }
            }
        }, 10000);
    });

    socket.on('message', (message) => {
        if (paired.has(socket)) {
            //whenever a message is getting posted, it passes through the censorfunciton
            const censoredMessage = censorMessage(message);
            paired.get(socket).emit("message", censoredMessage);
        }
    });
    socket.on("images",(img)=>{
        if(paired.has(socket)){
            paired.get(socket).emit("img",img);
            console.log("got the img")
        }
    })
    setInterval(() => {
        socket.emit("count", count);
    }, 1000);

    // Creating a new socket room for typing (when the user starts typing) and stop typing (when the user sits idle)
    //not sure about this piece of code



    // UJWAL MADE CHANGES HERE
    socket.on("typing",()=>{
        const opp_client = paired.get(socket);
        if(opp_client!==undefined){
            opp_client.emit("typing");
        }
    });


    // UJWAL MADE CHANGES HERE
    socket.on("stop typing",()=>{
        const opp_client = paired.get(socket);
        if(opp_client !== undefined){
            opp_client.emit("stop typing");
        }
    });


    socket.on("Left",()=>{
        console.log("USER LEFT!!");
        const opp_client = paired.get(socket);
        const name = clients.get(socket);
        paired.delete(socket);
        paired.delete(opp_client);
        clients.delete(socket);
        clients.delete(opp_client);
        if(opp_client !==undefined){
            opp_client.emit("left",name);
        }
    })
    socket.on("disconnect",()=>{
        count--;
        console.log("LOST A USER!!")
        const opp_client = paired.get(socket);
        const name = clients.get(socket);
        clients.delete(socket);
        paired.delete(socket);
        paired.delete(opp_client);
        if(opp_client !==undefined){
        opp_client.emit("left",name);
        }
    })
    socket.on("chatrooms",(name)=>{
        socket.emit("get_name",name);
    })
    socket.on("rooms",(channel)=>{
        socket.join(channel.id)
        socket.to(channel.id).emit("joined", channel.name + " joined");
        console.log(`joined ${channel}  ${channel.name}`);
    })
    socket.on("room_messages",(data)=>{
        console.log(data);
        socket.to(data.room).emit("messages_of_room",{name:data.name,message:data});
    })
    socket.on("left_room",(data)=>{
        socket.leave()
    })
});
