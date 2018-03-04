import * as Socket from 'socket.io'
import * as debug from 'debug';
import * as http from 'http';
import * as express from 'express';
import { Routes } from './routes/index';
import { Redis } from './Redis';
import { Mongoose } from './Mongoose';
class App{
    protected _express:express.Application;
    protected socket:SocketIO.Server = null;
    protected _redis:Redis = null;
    protected _mongo:Mongoose = null;
    run(){

        this._express = express()

        Routes.setup(this);
        var server = http.createServer(this.express);
        this.setupSocket(server);
        server.listen(3000, ()=>{
            console.log("Express Listening");
        });
        this._mongo = new Mongoose();
        //this._redis = new Redis();
    }
    get redis(){
        return this._redis;
    }
    get mongo(){
        return this._mongo
    }
    get express(){
        return this._express;
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
export { App }
export default new App().run()