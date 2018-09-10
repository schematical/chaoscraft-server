
import * as http from 'http';
import * as express from 'express';
import { Routes } from './routes/index';

import { Mongoose } from './services/Mongoose';

import { Redis } from './services/Redis';
import { SocketManager } from './services/SocketManager'
import * as config from 'config'
class App{
    protected _express:express.Application;
    protected _socket:SocketManager = null;
    protected _redis:Redis = null;
    protected _mongo:Mongoose = null;

    run(){
        this._mongo = new Mongoose();
        this._redis = new Redis();
        this._express = express();

        Routes.setup(this);
        var server = http.createServer(this.express);
        this._socket = new SocketManager(this, server);
        server.listen(config.get('port'), ()=>{
            console.log("Express Listening:", config.get('port'));
        });

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
    get socket(){
        return this._socket;
    }

}
export { App }
export default new App().run()