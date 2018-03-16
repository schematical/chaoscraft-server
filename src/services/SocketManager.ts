import * as _ from 'underscore';
import * as Socket from 'socket.io'
import * as debug from 'debug';
import { iBot } from '../models/Bot';
import { App } from '../App'
import * as fs from 'fs'
import { BrainMaker } from '../services/BrainMaker'
import * as config from 'config'
import * as replaceall from 'replaceall'
import * as SocketRedis from 'socket.io-redis'
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
        this.socket.adapter(SocketRedis({
            host: config.get('redis.chaoscraft.host'),
            port: config.get('redis.chaoscraft.port')
        }));

        this.socket.on('connection',  (socket)=> {
            this.onNewConnection(socket)
        });

/*        this.app.mongo.models.chaoscraft.Bot.remove({
            //username: 'ray-charles-0'
        }, (err:Error, bot)=>{
           console.error(err, bot);

        });*/
    }
    onNewConnection(socket){
        socket.join('main');
        this.debug("New bot connected");
        socket.emit('request_handshake', {});
        // when the client emits 'new message', this listens and executes
        socket.on('www_handshake', (data) => {
            let wwwSocket = new WWWSocket({
                socketManager: this,
                socket:socket
            });
        });
        socket.on('www_hello',  (data) => {
            // we tell the client to execute 'new message'
            this.debug("WWW_HELLO hit")

            let wwwSocket = new WWWSocket({
                socketManager: this,
                socket:socket
            });
            wwwSocket.onHello(data);


        });
        socket.on('client_handshake', (data) => {
            let botSocket = new BotSocket({
                socketManager: this,
                socket: socket
            });
            botSocket.onHandshake(data);
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
        this.socket.on('client_pong', (payload)=>{
            this.onClientPong(payload);
        });
       /* this.socket.on('client_not_firing', (payload)=>{
            this.onClientNotFiring(payload);
        });*/
        this.socket.on('client_day_passed', (payload)=>{
            this.onClientDayPassed(payload);
        });

        this.socket.on('client_node_error_threshold_hit', (payload)=>{
            this.onNodeErrorThresholdHit(payload);
        });
        this.socket.on('client_request_new_brain', (payload)=>{
            this.onRequestNewBrain(payload);
        })
        this.socket.on('client_spawn_complete', (payload)=>{
            this.onClientSpawnComplete(payload);
        })
    }
    markActive(payload){


        return new Promise((resolve, reject)=>{
            this.sm.app.redis.clients.chaoscraft.multi()
                .sadd('/active_bots', payload.username)
                .set('/bots/' + payload.username + '/active', true)
                .expire('/bots/' + payload.username + '/active', 5 * 60)
                .exec((err)=>{
                if(err){
                    return reject(err);
                }
                return resolve();
            });
        })
        .catch((err)=>{
            this.emitError(err);
        })
    }
    onNodeErrorThresholdHit(payload){

    }
    onClientDayPassed(payload){

    }
    onClientPong(payload){
        this.sm.debug("Pong recived: ", payload.username, "distanceTraveled", payload.distanceTraveled);
        this.markActive(payload);


        this.socket.to('www').emit('client_pong', payload);

        if(payload.distanceTraveled < 10) {
            return this.onClientNotFiring(payload);
        }

        //TODO: Run the fittness function

        return new Promise((resolve, reject)=>{

            return this.sm.app.mongo.models.chaoscraft.Bot.findOne({
                username: payload.username
            }, (err:Error, bot:iBot)=>{
                if(err) {
                    return reject(err);
                }
                this.bot = bot;
                return resolve(bot);
            })

        })
        .then(()=>{

            return  new Promise((resolve, reject)=> {
                let _payload = _.clone(payload);
                delete(_payload.nodeInfo);

                let multi = this.sm.app.redis.clients.chaoscraft.multi();

                multi.hmset('/bots/' + this.bot.username + '/position', 'x', _payload.position.x);
                multi.hmset('/bots/' + this.bot.username + '/position', 'y', _payload.position.y);
                multi.hmset('/bots/' + this.bot.username + '/position', 'z', _payload.position.z);
                delete(_payload.position);
                Object.keys(_payload).forEach((key) => {
                    multi.hmset('/bots/' + this.bot.username + '/pong', key, _payload[key]);
                })


                multi.exec((err) => {
                    if (err) {
                        return reject(err);
                    }
                    return resolve();
                });
            });

        })

        .then(()=>{
            return this.updateBrainWithNodeData(payload);
        })
        .then(()=>{
            return this.spawnChildren(payload);
        })
        .catch((err)=>{
            return this.emitError(err);
        })

    }
    updateBrainWithNodeData(payload){
        return new Promise((resolve, reject)=>{
            let brain = JSON.parse(this.bot.brain);
            Object.keys(payload.nodeInfo).forEach((nodeId)=>{
                let nodeInfo = payload.nodeInfo[nodeId];
                if(nodeInfo.activationCount == 0){
                    delete(brain[nodeId]);
                }
            })

            this.bot.brain = JSON.stringify(brain);
            return this.bot.save((err:Error, bot:iBot)=>{
                if(err) {
                    return reject(err);
                }
                this.bot = bot;
                return resolve(bot);
            })

        })
    }
    spawnChildren(payload){
        let options = {
            brainData: JSON.parse(this.bot.brain),
            generation: this.bot.generation
        }
        let brainMaker = new BrainMaker();
        let brainData = brainMaker.create(options);

        let parts = this.bot.username.split('-');
        let generationAndHeritage = parts.pop();
        let usernameBase = parts.join('-');
        if(usernameBase.length + generationAndHeritage.length > 14){
            usernameBase = usernameBase.substr(0, 14 - generationAndHeritage.length);
        }
        let generation = this.bot.generation += 1;
        let alphabet = 'abcdefghijklmnopqrstuvwxyz';
        let promises = [];
        for(let i = 0; i < config.get('brain.max_litter_size'); i++){
            promises.push(new Promise((resolve, reject)=>{


                this.bot = this.sm.app.mongo.models.chaoscraft.Bot({
                    username: usernameBase +'-'+generationAndHeritage + alphabet.substr(i, 1),
                    name:this.bot.name,
                    brain: JSON.stringify(brainData),
                    generation:generation,
                    mother: this.bot._id
                })
                return this.bot.save((err:Error, bot:iBot)=>{
                    if(err) {
                        return reject(err);
                    }
                    return resolve(bot);

                })
            }))
        }
        return Promise.all(promises);


    }
    onClientNotFiring(payload){
        //Delete the user?
        return new Promise((resolve, reject)=>{
            if(!payload.username){
                return reject(new Error("No payload.username "));
            }
            return this.sm.app.mongo.models.chaoscraft.Bot.findOne({
                username: payload.username
            }, (err:Error, bot:iBot)=>{
                if(err) {
                    return reject(err);
                }
                if(!bot){
                    return reject(new Error("No valid bot with username: " + payload.username));
                }
                this.bot = bot;
                return resolve(bot);
            })

        })
        .then((bot:iBot)=>{
            return new Promise((resolve, reject)=>{
                console.log("Removing  " +payload.username + " for not firing after 30");
                bot.alive = false;
                return bot.save((err)=>{
                    console.log("Removing  " +payload.username + " SAVED - ", err, bot && bot.toJSON());
                    if(err){
                        return reject(err);
                    }
                    return resolve(bot);
                })
            })
        })
        .then((bot:iBot)=>{

            return new Promise((resolve, reject)=>{
                this.sm.app.redis.clients.chaoscraft.srem('/active_bots', bot.username, (err)=>{
                    if(err){
                        return reject(err);
                    }
                    return resolve();
                });
            });
        })
        .then(()=>{
            return this.onHello({});
        })
        .catch((err)=>{
            console.error(err.message, err.stack);
        })
    }
    onFireOutputNode(payload){

        if(!payload.username){
            return this.sm.debug('No username passed in to `onFireOutputNode`');
        }
        //console.log("Sending:", 'client_fire_outputnode', this.bot.username, payload)
        this.socket.to('www')/*broadcast*/.emit('client_fire_outputnode', {
            payload: payload,
            username: payload.username
        })
    }
    emitError(err){
        this.sm.debug("Error:", err.message, err.stack);
        return this.socket.emit('server_error',  { message: err.message });
    }
    onDisconnect(){
        if(!this.bot){
            return;
        }
        this.sm.app.redis.clients.chaoscraft.srem('/active_bots', this.bot.username, (err)=>{
            if(err){
                return this.emitError(err);
            }
        });
    }
    onRequestNewBrain(payload){
        payload._old_username = payload.username;
        payload.username = null;
        this.onHello(payload);
    }
    onHandshake(data){
        if (!data.username) {
            return this.emitError(new Error("No valid username submitted"));

        }
        return new Promise((resolve, reject) => {
            return this.sm.app.mongo.models.chaoscraft.Bot.findOne({
                username: data.username
            }, (err: Error, bot: iBot) => {
                if (err) {
                    return reject(err);
                }
                this.bot = bot;
                return resolve(bot);
            })


        })
        .then(()=>{
            this.sm.debug(this.bot.username + " - Successfully Reconnected and Handshake");
        })
        .catch((err)=>{
            return  this.emitError(err)
        })

    }
    onHello(data){
        let p = null;
        if (data.username) {
            p = new Promise((resolve, reject) => {
                return this.sm.app.mongo.models.chaoscraft.Bot.findOne({
                    username: data.username
                }, (err: Error, bot: iBot) => {
                    if (err) {
                        return reject(err);
                    }
                    this.bot = bot;
                    return resolve(bot);
                })


            })
        }else{
            p = this.getInActiveUser();
        }

        return p.then((bot)=>{
            if(bot){
                return bot;
            }
            return new Promise((resolve, reject)=>{

                //Lets create one
                let options = {

                }
                let brainMaker = new BrainMaker();
                let brainData = brainMaker.create(options);
                let names = fs.readFileSync(__dirname + '/../../config/names.csv').toString().split('\n')
                let name = names[Math.floor(Math.random() * names.length)].split(',')[1];
                let parts = name.split(' ');
                let username = null;
                if(parts.length == 1){
                    username = parts[0];
                }else{
                    username = parts[0].substr(0,1) + '-' + parts[1];
                }
                username = username.toLowerCase();
                username = replaceall(' ', '-', username);
                username = replaceall(',', '', username);
                username = replaceall('.', '', username);
                if(username.length > 14){
                    username = username.substr(0, 14);
                }
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

            })
        })
        .then((bot) => {
            this.bot = bot;
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
            return this.markActive(this.bot);
        })
        .then(()=>{
            console.log('Sending -client_hello_response', this.bot.username);
            return this.socket.emit('client_hello_response', this.bot.toJSON());
        })
        .then(()=>{
            return this.socket.to('www').emit('client_hello', this.bot.toJSON());
        })
        .catch((err)=>{
           this.emitError(err);
        })
    }
    onClientSpawnComplete(payload){
        return new Promise((resolve, reject)=>{
            let multi = this.sm.app.redis.clients.chaoscraft.multi()
            multi.hmset( '/bots/' + this.bot.username + '/position', 'x', payload.startPosition.x);
            multi.hmset( '/bots/' + this.bot.username + '/position', 'y', payload.startPosition.y);
            multi.hmset( '/bots/' + this.bot.username + '/position', 'z', payload.startPosition.z);
            delete(payload.startPosition);
            Object.keys(payload).forEach((key)=>{
                multi.set( '/bots/' + payload.username + '/spawn_data', key, payload[key]);
            })
            multi.exec((err)=>{
                (err)=>{
                    if(err){
                        return reject(err);
                    }
                    return resolve();
                }
            });

        });
    }
    getInActiveUser(){
        return new Promise((resolve, reject)=> {
            //Load any bots on deck
            return this.sm.app.redis.clients.chaoscraft.smembers('/active_bots', (err, usernames)=>{
                if(err) return reject(err);
                return resolve(usernames);
            })
        })
        .then((usernames:any)=>{
            return new Promise((resolve, reject)=>{
                let multi = this.sm.app.redis.clients.chaoscraft.multi();
                usernames.forEach((username)=>{
                    multi.get('/bots/' + username + '/active');
                });
                multi.exec((err, results)=>{
                    if(err) return reject(err);
                    let queryUsernames = [];
                    usernames.forEach((username, index)=> {
                        if(results[index]){
                            queryUsernames.push(username);
                        }
                    });
                    return this.sm.app.mongo.models.chaoscraft.Bot.findOne({
                        username: {
                            $nin: queryUsernames
                        },
                        alive: true
                    }, (err:Error, bot:iBot)=>{
                        if(err) {
                            return reject(err);
                        }
                        return resolve(bot);
                    })
                })
            })
        })
    }
}
class WWWSocket{
    protected socket:any = null;
    protected sm:SocketManager = null;
    constructor(options:any){
        this.socket = options.socket;
        this.sm = options.socketManager;
        this.socket.join("www");

    }
    onHello(data){
        this.socket.emit('www_hello_response', {
            username: 'x',//socket.username,
            message: data
        });
    }
}
export { SocketManager }