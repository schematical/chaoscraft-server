import * as _ from 'underscore';
import * as Socket from 'socket.io'
import * as debug from 'debug';
import { iBot } from '../models/Bot';
import { App } from '../App'
import * as fs from 'fs'
import { BrainMaker } from './BrainMaker'
import { FitnessManager } from './FitnessManager'
import * as config from 'config'
import * as replaceall from 'replaceall'
import * as SocketRedis from 'socket.io-redis'
import * as shortid from 'shortid';
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
    protected fitnessManager:FitnessManager = null;
    constructor(options:any){

        this.socket = options.socket;
        this.sm = options.socketManager;
        this.fitnessManager = new FitnessManager({
            botSocket: this,
            app: this.sm.app
        });

        this.socket.join('clients');
        this.socket.on('disconnect', ()=>{
            //this.onDisconnect();
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
        this.socket.on('client_death', (payload)=>{
            this.onDeath(payload);
        })
        this.socket.on('achivment', (payload)=>{
            this.onAchivement(payload);
        })

    }
    onAchivement(payload:any){
        let multi = this.sm.app.redis.clients.chaoscraft.multi();
        multi.hincrby('/bots/' + payload.username + '/stats', payload.type, payload.value || 1);
        multi.hincrby('/stats/' + payload.type, payload.username, payload.value || 1);
        multi.exec((err)=>{
            if(err){
                return this.emitError(err);
            }
            //Success

        });

    }
    markActive(payload){


        return new Promise((resolve, reject)=>{
            this.sm.app.redis.clients.chaoscraft.multi()
                .sadd('/active_bots', payload.username)
                .set('/bots/' + payload.username + '/active', true)
                .expire('/bots/' + payload.username + '/active', 1 * 60)
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
    onDeath(payload){
        switch(payload.username){
            case('adam-0'):
                return;
            default:
        }
        return this.onClientNotFiring(payload);
    }
    onNodeErrorThresholdHit(payload){

    }
    onClientDayPassed(payload){

    }
    onClientPong(payload){
        this.sm.debug("Pong recived: ", payload.username, "distanceTraveled", payload.distanceTraveled);
        this.markActive(payload);


        this.socket.to('www').emit('client_pong', payload);




        return new Promise((resolve, reject)=>{

            return this.sm.app.mongo.models.chaoscraft.Bot.findOne({
                username: payload.username
            }, (err:Error, bot:iBot)=>{
                if(err) {
                    return reject(err);
                }
                if(!this.bot){
                    this.onHello({});
                    return reject(new Error("No bot found with `payload.username` = " + payload.username))
                }
                this.bot = bot;

                return resolve(bot);
            })

        })
        .then(()=>{
            return new Promise((resolve, reject)=>{
                this.bot.age += 1;
                this.bot.save((err)=>{
                    if(err){
                        return reject(err);
                    }
                })
                return resolve();
            })
        })
        .then(()=>{

            return  new Promise((resolve, reject)=> {
                let _payload = _.clone(payload);
                delete(_payload.nodeInfo);

                let multi = this.sm.app.redis.clients.chaoscraft.multi();
                if(_payload.position) {
                    multi.hmset('/bots/' + this.bot.username + '/position', 'x', _payload.position.x);
                    multi.hmset('/bots/' + this.bot.username + '/position', 'y', _payload.position.y);
                    multi.hmset('/bots/' + this.bot.username + '/position', 'z', _payload.position.z);
                    multi.hmset('/bots/' + this.bot.username + '/stats', 'distance_traveled', payload.distanceTraveled);

                    multi.hmset('/bots/' + this.bot.username + '/stats', 'health', _payload.health);
                    multi.hmset('/bots/' + this.bot.username + '/stats', 'food', _payload.health);
                    multi.hmset('/stats/distance_traveled',  this.bot.username, payload.distanceTraveled);

                    multi.hmset('/stats/age',  this.bot.username, this.bot.age);
                    multi.hmset('/stats/health',  this.bot.username, payload.health);
                    multi.hmset('/stats/health_age',  this.bot.username, payload.health * this.bot.age);
                    multi.hmset('/stats/food',  this.bot.username, payload.food);
                    multi.hmset('/stats/food_age',  this.bot.username, payload.food  * this.bot.age);
                    delete(_payload.position);
                }
                if(_payload.inventory) {
                    multi.set('/bots/' + this.bot.username + '/inventory', JSON.stringify(_payload.inventory));
                    multi.hmset('/bots/' + this.bot.username + '/stats', 'inventory', Object.keys(_payload.inventory).length);
                    multi.hmset('/stats/inventory', this.bot.username, Object.keys(_payload.inventory).length);
                    let inventory_ct = 0;
                    Object.keys(_payload.inventory).forEach((key)=>{
                        inventory_ct += _payload.inventory[key].count;
                    })
                    multi.hmset('/bots/' + this.bot.username + '/stats', 'inventory_ct', inventory_ct);
                    multi.hmset('/stats/inventory_ct', this.bot.username, inventory_ct);
                    delete(_payload.inventory);
                }
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
            return this.fitnessManager.testFitness(this.bot, payload);
        })
        /*.then(()=>{
            return new Promise((resolve, reject)=>{

                let multi = this.sm.app.redis.clients.chaoscraft.multi();
                multi.hgetall('/bots/' + this.bot.username + '/stats')
                return multi.exec((err, stats)=>{
                    if(err){
                        return reject(err);
                    }
                    return resolve(stats[0]);
                })
            })

        })
        .then((stats:any)=>{

            let flagBot = false;

            if(
                this.bot.age > 7 &&
                payload.distanceTraveled < 20
            ) {
                return this.onClientNotFiring(payload);
            }

            if(
                this.bot.age > 14 &&
                this.bot.generation > 2 &&
                !stats.dig
            ){
                return this.onClientNotFiring(payload);
            }

            if(
                this.bot.age > 19 &&
                this.bot.generation > 4 &&
                !stats.equip
            ){
                return this.onClientNotFiring(payload);
            }

            if(
                this.bot.age > 25 &&
                this.bot.generation > 8
            ){
                if(!stats.place_block){
                    return this.onClientNotFiring(payload);
                }else{
                    flagBot = true;
                }
            }

            if(
                this.bot.age > 50 &&
                this.bot.generation > 16 &&
                !stats.attack
            ){
                return this.onClientNotFiring(payload);
            }
            if(
                this.bot.age > 100 &&
                this.bot.generation > 32 &&
                !stats.craft
            ){
                return this.onClientNotFiring(payload);
            }

            if(
                this.bot.age > 300
            ){
                //Its just time to die
                return this.onClientNotFiring(payload);
            }


            if(this.bot.age % <number>config.get('brain.spawn_children_pong_ct') === 0){
                return this.spawnChildren(payload);
            }
            if(!flagBot) {
                return;
            }
            if(this.bot.flagged){
                return;
            }
            this.bot.flagged = true;
            return new Promise((resolve, reject)=>{
                this.bot.save((err)=>{
                    if(err){
                        return reject(err);
                    }
                    return resolve();
                })
            })

        })*/
        .catch((err)=>{
            return this.emitError(err);
        })

    }
    updateBrainWithNodeData(payload){
        return new Promise((resolve, reject)=>{
            let brain = JSON.parse(this.bot.brain);
            Object.keys(payload.nodeInfo).forEach((nodeId)=>{
                let nodeInfo = payload.nodeInfo[nodeId];
                if(!brain[nodeId]){
                    return console.error(this.bot.username + ' - has no brain nodeId: ' + nodeId)
                }
                brain[nodeId].activationCount =  brain[nodeId].activationCount || 0;
                brain[nodeId].activationCount += nodeInfo.activationCount;
                if(brain[nodeId].activationCount == 0){
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
        let generation = this.bot.generation + 1;
        if(this.bot.username == 'adam-0'){
            this.bot.brain = fs.readFileSync(__dirname + '/../../adam.json').toString();
        }
        let options = {
            brainData: JSON.parse(this.bot.brain),
            generation: generation
        }



        let parts = this.bot.username.split('-');
        let generationAndHeritage = parts.pop().substr(1);
        let usernameBase = parts.join('-');
        if(usernameBase.length + generationAndHeritage.length > 13){
            usernameBase = usernameBase.substr(0, 13 - generationAndHeritage.length);
        }

        let promises = [];
        let litterSize = Math.floor(<number>config.get('brain.max_litter_size') * Math.random());
        for(let i = 0; i < litterSize; i++){

            promises.push(new Promise((resolve, reject)=>{
                console.log("About to generate brain")
                let brainMaker = new BrainMaker();
                let brainData = brainMaker.create(options);
                console.log("Successfully  generate brain");
                this.bot.spawnCount = this.bot.spawnCount || 0;
                this.bot.spawnCount += 1;
                let _shortid = shortid.generate();
                let childBot = this.sm.app.mongo.models.chaoscraft.Bot({
                    username: usernameBase +'-'+generation  + '-' + _shortid,
                    name:this.bot.name,
                    brain: JSON.stringify(brainData),
                    generation:generation,
                    mother: this.bot._id,
                    shortid: _shortid
                })
                return childBot.save((err:Error, bot:iBot)=>{
                    if(err) {
                        return reject(err);
                    }
                    return resolve(bot);

                })
            }))
        }

        return Promise.all(promises)
            .then(()=>{
                return new Promise((resolve, reject)=>{

                    this.bot.save((err)=>{
                        if(err){
                            return reject(err);
                        }
                    })
                    return resolve();
                })
            })
            .catch((err)=>{
                console.error(err.message, err.stack);
            })


    }
    onClientNotFiring(payload){

        switch(payload.username){
            case('adam-0'):
                return;
            default:
        }
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
                    this.onHello({});
                    return reject(new Error("No valid bot with username: " + payload.username));
                }
                this.bot = bot;
                return resolve(bot);
            })

        })
        .then((bot:iBot)=>{

            return new Promise((resolve, reject)=>{
                this.sm.app.redis.clients.chaoscraft.srem('/active_bots', bot.username, (err)=>{
                    if(err){
                        return reject(err);
                    }
                    return resolve(bot);
                });
            });
        })
        .then((bot:iBot)=>{
            return new Promise((resolve, reject)=>{

                console.log("Removing  " +payload.username + " for not firing after 30");
                bot.alive = false;
                if(bot.generation < 3 && !bot.flagged){
                    return bot.remove/*.save*/((err)=>{
                        //console.log("Removing  " +payload.username + " SAVED - ", err, bot && bot.toJSON());
                        if(err){
                            return reject(err);
                        }
                        return resolve(bot);
                    })
                }
                return bot.save((err)=>{
                    //console.log("Removing  " +payload.username + " SAVED - ", err, bot && bot.toJSON());
                    if(err){
                        return reject(err);
                    }
                    return resolve(bot);
                })
            })
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
        if(err.errors){
            err.errors.forEach((_err)=>{
                this.emitError(_err);
            })
            return;
        }
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
                if(!this.bot){
                    this.onHello({});
                    return reject(new Error("No bot found with username `" + data.username + "`"))
                }
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
        }else if(Math.round(Math.random()) == 1){
            p = this.getInActiveUser();
        }else{
            p = new Promise((resolve, reject)=>{
                return resolve();
            })
        }

        return p.then((bot)=>{
            if(bot){
                return bot;
            }

            return new Promise((resolve, reject)=>{
                let names = fs.readFileSync(__dirname + '/../../config/names.csv').toString().split('\n')
                let name = names[Math.floor(Math.random() * names.length)].split(',')[1];
                //Lets create one
                let options = {

                }
                let brainMaker = new BrainMaker();
                let brainData = brainMaker.create(options);
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
                        return this.onHello(data);
                        //return reject(err);
                    }
                    return resolve(bot);

                })

            })
        })
        .then((bot) => {
            this.bot = bot;
            return new Promise((resolve, reject)=>{
                let multi = this.sm.app.redis.clients.chaoscraft.multi();
                multi.hincrby('/bots/' + this.bot.username + '/stats', 'loaded_count',1);
                multi.sadd('/active_bots', this.bot.username);
                return multi.exec((err)=>{
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
                multi.set( '/bots/' + payload.username + '/spawn_data', key, payload[key] || {});
            })
            multi.exec((err)=>{
                (err)=>{
                    if(err){
                        return reject(err);
                    }
                    return resolve();
                }
            });

        })
        .catch((err)=>{
            return  this.emitError(err)
        })
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
                    let query:any = {};

                    let queryUsernames = [];
                    usernames.forEach((username, index)=> {
                        if(results[index]){
                            queryUsernames.push(username);
                        }
                    });

                    query.username =  {
                        $nin: queryUsernames
                    };
                    query.alive = true;




                    return this.sm.app.mongo.models.chaoscraft.Bot.findOne(query)
                        .sort({ spawnPriority: -1})
                        .exec((err:Error, bot:iBot)=>{
                            if(err) {
                                return reject(err);
                            }
                            return resolve(bot);
                        }
                    )
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
        this.socket.on('www_ping', this.onPing.bind(this));
    }
    onHello(data){
        this.socket.emit('www_hello_response', {
            username: 'x',//socket.username,
            message: data
        });
    }
    onPing(data){
        this.sm.debug("Reviced `www_ping`. Pinging `clients` channel");
        this.socket.to('clients').emit('client_ping', data);

    }
}
export { SocketManager, BotSocket }