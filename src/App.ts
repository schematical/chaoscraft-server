import * as Socket from 'socket.io'
import * as debug from 'debug';
import * as http from 'http';
import * as express from 'express';

class App{
    protected app:express.Application;
    protected socket:SocketIO.Server = null;
    run(){

        this.app = express()
        this.app.use((req, res, next)=>{
            res.set('Access-Control-Allow-Origin', 'http://localhost:3000');
            return next();
        })
        this.app.get('/', (req, res) => res.send('Hello World!'))
        var server = http.createServer(this.app);
        this.setupSocket(server);
        server.listen(3000, ()=>{
            console.log("Express Listening");
        });

    }
    setupSocket(server){
        this.socket = Socket(
            server,
            {
                //path: '/',
                //serveClient: false,
                // below are engine.IO options
                /*pingInterval: 10000,
                pingTimeout: 5000,
                cookie: false*/
            }
        );
        this.socket.on('connection', function (socket) {
            socket.join('main');
            console.log("New bot connected");
            // when the client emits 'new message', this listens and executes
            socket.on('www_hello', function (data) {
                // we tell the client to execute 'new message'
                console.log("WWW_HELLO hit")
                socket.emit('www_hello_response', {
                    username: 'x',//socket.username,
                    message: data
                });
            });
            socket.on('client_hello', function (data) {
                // we tell the client to execute 'new message'
                socket.emit('client_hello_response', {
                    username: 'x',//socket.username,
                    message: data
                });
            });
        });
    }
}
export default new App().run()