import * as Socket from 'socket.io'
import * as debug from 'debug';
import * as http from 'http';
import * as express from 'express';
import { Routes } from './routes/index';
import { Redis } from './Redis';
import { Mongoose } from './Mongoose';
import { IBrain } from './models/Brain';
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
        this.socket.on('connection',  (socket)=> {
            socket.join('main');
            console.log("New bot connected");
            // when the client emits 'new message', this listens and executes
            socket.on('www_hello',  (data) => {
                // we tell the client to execute 'new message'
                console.log("WWW_HELLO hit")
                socket.emit('www_hello_response', {
                    username: 'x',//socket.username,
                    message: data
                });

            });
            socket.on('client_hello',  (data) => {
                // we tell the client to execute 'new message'
                return this.mongo.models.chaoscraft.Brain.findOne({
                    name:'Test'
                }, (err:Error, brain:IBrain)=>{
                    if(err) {
                        return socket.emit('error',  { message: err.message });
                    }

                    socket.emit('client_hello_response', brain.toObject());

                })

            });
        });
    }
}
export { App }
export default new App().run()