import * as express from 'express';
import * as Socket from 'socket.io'
import * as debug from 'debug';
import { iBot } from '../models/Bot';
import { App } from '../App'
import * as fs from 'fs'
import { BrainMaker } from '../services/BrainMaker'

import * as replaceall from 'replaceall'
class SocketManager{
    public debug = null;
    protected socket:SocketIO.Server = null;
    public app:App = null;
    constructor(app:App, server){
        this.app = app;
        this.debug = debug('chaoscraft.socketmanager');
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
            this.onNewConnection(socket)
        });


        /*this.app.mongo.models.chaoscraft.Bot.findOne({
            _id: '5a9db5a109dcdf68535cb767'
        }, (err:Error, bot)=>{
            bot.username = 'roald-dahl-0';
            bot.name = 'Roald Dahl';
            bot.save(()=>{
            this.debug('Update Bots', err)
            })

        });*/
    }
    onNewConnection(socket){
        socket.join('main');
        this.debug("New bot connected");

        // when the client emits 'new message', this listens and executes
        socket.on('www_hello',  (data) => {
            // we tell the client to execute 'new message'
            this.debug("WWW_HELLO hit")
            socket.emit('www_hello_response', {
                username: 'x',//socket.username,
                message: data
            });

        });
        socket.on('client_hello',  (data) => {
            let botSocket = new BotSocket({
                socketManager: this,
                socket:socket
            })
            botSocket.onHello(data);

        })

    }



}

class BotSocket{
    protected bot: iBot = null;
    protected socket:any = null;
    protected sm:SocketManager = null;
    constructor(options:any){
        this.socket = options.socket;
        this.sm = options.socketManager;


        this.socket.on('disconnect', ()=>{
            this.onDisconnect();
        });
        this.socket.on('client_fire_outputnode', (payload)=>{
            this.onFireOutputNode(payload);
        });

    }
    onFireOutputNode(payload){
        this.socket.broadcast.emit('client_fire_outputnode', {
            payload: payload,
            username: this.bot.username
        })
    }
    emitError(err){
        this.sm.debug("Error:", err.message);
        return this.socket.emit('error',  { message: err.message });
    }
    onDisconnect(){
        this.sm.app.redis.clients.chaoscraft.srem('/active_bots', this.bot.username, (err)=>{
            if(err){
                return this.emitError(err);
            }
        });
    }
    onHello(data){
        let p = new Promise((resolve, reject)=>{
            if(data.username){
                return resolve(data.username);
            }
            //Load any bots on deck
            //this.app.redis.smembers('/')
            return resolve(false);
        })
        .then((botId)=>{
            return new Promise((resolve, reject)=>{

                if(!botId){
                    //Lets create one
                    let options = {
                        length: 100,
                        maxChainLength:  10
                    }
                    let brainMaker = new BrainMaker();
                    let brainData = brainMaker.create(options);
                    let names = fs.readFileSync(__dirname + '/../../config/names.csv').toString().split('\n')
                    let name = names[Math.floor(Math.random() * names.length)].split(',')[1];
                    let username = name.toLowerCase();
                    username = replaceall(' ', '-', username);
                    username = replaceall(',', '', username);
                    username = replaceall('.', '', username);
                    let generation = 0;
                    this.bot = this.sm.app.mongo.models.chaoscraft.Bot({
                        username: username +'-'+generation,
                        name:name,
                        brain: JSON.stringify(brainData),
                        generation:generation
                    })
                    return this.bot.save((err:Error, bot:iBot)=>{
                        if(err) {
                            return reject(err);
                        }
                        return resolve(bot);

                    })
                }
                // we tell the client to execute 'new message'
                return this.sm.app.mongo.models.chaoscraft.Bot.findOne({
                    username: botId
                }, (err:Error, bot:iBot)=>{
                    if(err) {
                        throw err;
                    }
                    this.bot = bot;
                    return resolve(bot);
                })
            })
        })
        .then(()=>{
            return new Promise((resolve, reject)=>{

                return this.sm.app.redis.clients.chaoscraft.sadd('/active_bots', this.bot.username, (err)=>{
                    if(err){
                        return reject(err);
                    }
                    return resolve();
                })
            })
        })
        .then(()=>{
            return this.socket.emit('client_hello_response', this.bot.toJSON());
        })
        .catch((err)=>{
           this.emitError(err);
        })
    }
}
class WWWSocket{
    protected socket:any = null;
    protected sm:SocketManager = null;
    constructor(options:any){
        this.socket = options.socket;
        this.sm = options.socketManager;

    }
}
export { SocketManager }