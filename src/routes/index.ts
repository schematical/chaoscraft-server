import { iBot } from '../models/Bot';
import { App } from '../App';
import * as _ from 'underscore';
import * as errorHandler from 'errorhandler';
import * as bodyParser from 'body-parser';
import { BrainMaker } from '../services/BrainMaker'
import * as fs from 'fs';
import * as MinecraftData from 'minecraft-data'
import * as config from 'config';
import {networkInterfaces} from "os";
class Routes{
    static setup(app:App){
        app.express.disable('etag');
        app.express.enable('trust proxy');
        app.express.use(errorHandler());
        app.express.get('/heartbeat', (req, res, next)=>{
           
            return res.json({ status: "Living the dream!!!!" });

        })
        app.express.param('bot', (req, res, next)=>{
            return app.mongo.models.chaoscraft.Bot.findOne({
                $or:[
                   /* {
                        _id: req.params.bot
                    },*/
                    {
                        username: req.params.bot
                    }
                ]
            }, (err:Error, bot:iBot)=>{
                if(err) {
                    return next(err);
                }
                req.params._bot = bot;
                return next();
            })
        })
        app.express.use(bodyParser.json());
        app.express.use(bodyParser.urlencoded({extended: false}));

        app.express.use((req, res, next)=>{
            res.set('Access-Control-Allow-Headers', 'Content-Type');
            res.set('Access-Control-Allow-Credentials', 'true');
            res.set('Access-Control-Allow-Origin', 'http://localhost:4200');
            return next();
        })
        app.express.get('/', (req, res) => res.send('Hello World!'));
        app.express.get('/bots/:bot/test', (req, res, next) => {
            if(!req.params._bot){
                return res.status(404).json({});
            }
            /*let options = {
                brainData: JSON.parse(req.params._bot.brain),
                generation: req.params._bot.generation
            }*/
            let brainMaker = new BrainMaker();
            //let brainData = brainMaker.create(options);
            let brainholder = {};
            brainholder[req.params._bot.generation] = JSON.parse(req.params._bot.brain);
            const TEST_LENGTH = 10;
            for(var i = req.params._bot.generation + 1; i < TEST_LENGTH; i++){

                brainholder[i] = brainMaker.create({
                    brainData: brainholder[i - 1] || null,
                    generation: i
                });

            }

            return res.json(brainholder[TEST_LENGTH - 1]);
        });

        app.express.post('/reset', (req, res, next) => {
            return new Promise((resolve, reject)=> {
                //Load any bots on deck
                return app.redis.clients.chaoscraft.keys(config.get('redis.chaoscraft.prefix') + '*', (err, keys)=>{
                    if(err) return reject(err);
                    return resolve(keys);
                })
            })
            .then((keys:any)=>{
                return new Promise((resolve, reject)=> {
                    let multi = app.redis.clients.chaoscraft.multi();
                    keys.forEach((key)=>{
                        key = key.substr((<string>config.get('redis.chaoscraft.prefix')).length)
                        multi.del(key);
                    })

                    return multi.exec((err)=>{
                        if(err) return reject(err);
                        return resolve();
                    })
                })
            })
            .then(()=>{
                return new Promise((resolve, reject)=> {
                    let query = {
                        flagged: {$ne: true}
                    }
                    return app.mongo.models.chaoscraft.Bot.remove(query, (err)=>{
                        if(err) return reject(err);
                        return resolve();
                    })
                })
            })
            .then(()=>{
                return res.json({
                    message: "Done"
                });
            })
            .catch(next);
        })


        app.express.post('/bots', (req, res, next) => {
            //Load a brain
            let options = {
                length: req.body.length || null,
                maxChainLength: req.body.maxChainLength || null
            }
            let brainMaker = new BrainMaker();
            let brainData = brainMaker.create(options);
            let brain = app.mongo.models.chaoscraft.Bot({
                name:"Adam",
                brain: JSON.stringify(brainData),
                generation:0
            })
            brain.save((err:Error, brain:iBot)=>{
                if(err) {
                    return next(err);
                }
                return res.json(brain.toJSON());
            })
        })
        app.express.get('/bots', (req, res, next) => {
            //Load a brain

            let query:any ={ }
            if(_.isUndefined(req.query.alive) || req.query.alive){
                query.alive =  true;
            }else{
                query.alive = false;
            }

            return app.mongo.models.chaoscraft.Bot.find(
                query,
                (err:Error, brains:Array<iBot>)=>{
                    if(err) {
                        return next(err);
                    }
                    return res.json(brains);
                }
            )
        })

        app.express.get('/bots/active', (req, res, next) => {
            //Load a brain
            return new Promise((resolve, reject)=> {
                //Load any bots on deck
                return app.redis.clients.chaoscraft.smembers('/active_bots', (err, usernames)=>{
                    if(err) return reject(err);
                    return resolve(usernames);
                })
            })
            .then((usernames:any)=>{
                return new Promise((resolve, reject)=> {
                    let multi = app.redis.clients.chaoscraft.multi();
                    usernames.forEach((username) => {
                        multi.get('/bots/' + username + '/active');
                    });
                    multi.exec((err, results) => {
                        if (err) return reject(err);
                        let botUsernames = [];
                        usernames.forEach((username, index) => {
                            if (results[index]) {
                                botUsernames.push(username);
                            }
                        });
                       return resolve(botUsernames)
                    })
                })

            })
            .then((usernames:any)=>{
                return new Promise((resolve, reject)=> {
                    return app.mongo.models.chaoscraft.Bot.find({
                        username: {
                            $in:usernames
                        }
                    })
                    .exec((err, results) => {
                        if (err) return reject(err);

                        return resolve(results)
                    })
                })

            })
            .then((bots)=>{
                return res.json(bots);
            })
            .catch(next);

        })

        app.express.get('/bots/:bot', (req, res, next) => {
            //Load a brain
            if(!req.params._bot){
                return res.status(404).json({});
            }
            return res.json(req.params._bot.toJSON());

        })

        app.express.get('/bots/:bot/world', (req, res, next) => {
            //Load a brain
            if(!req.params._bot){
                return res.status(404).json({});
            }
            //TODO: We need to store the bots x and y
            return new Promise((resolve, reject)=>{
                app.redis.clients.chaoscraft.hgetall('/bots/' + req.params._bot.username + '/position', (err, res)=>{
                    if(err) return next(err);
                    if(!res){
                        return res.status(404).json({
                            error:{
                                message:"No `position` data found in redis"
                            }
                        });
                    }
                });
            })
            .then((position:any)=>{
                let range = 20;
                let worldData = {};
                let responseData:any = {
                    x:{
                        min: position.x - range,
                        max: position.x + range,
                    },
                    y:{
                        min: position.y - range,
                        max: position.y + range,
                    },
                    z:{
                        min: position.z - range,
                        max: position.z + range,
                    }
                };

                return new Promise((resolve, reject)=> {
                    let multi = app.redis.clients.chaoscraft.multi();
                    for(let x = responseData.x.min; x <= responseData.x.max; x++){
                        for(let y = responseData.y.min; y <= responseData.y.max; y++){
                            for(let z = responseData.z.min; z <=  responseData.z.max + range; z++){
                                let key = '/world/blocks/' + x +  '/' + y + '/' + z
                                multi.hgetall(key);
                            }
                        }
                    }
                    return multi.exec((err, response)=>{
                        if(err){
                            return reject(err);
                        }
                        let i = 0;
                        for(let x = position.x - range; x <= position.x + range; x++){
                            worldData[x] =  worldData[x] || {};
                            for(let y = position.y - range; y <= position.y + range; y++){
                                worldData[x][y] =  worldData[x][y] || {};
                                for(let z = position.z - range; z <= position.z + range; z++){
                                    i += 1;
                                    worldData[x][y][z] = response[i] || null;
                                }
                            }
                        }
                        responseData.world = worldData;
                        return resolve(responseData);
                    })
                })
            })
            .then((response)=>{
                return res.json(response);
            })
            .catch(next);
        })
        app.express.get('/bots/:bot/world/top', (req, res, next) => {
            //Load a brain
            if(!req.params._bot){
                return res.status(404).json({});
            }
            //TODO: We need to store the bots x and y
            return new Promise((resolve, reject)=>{
                app.redis.clients.chaoscraft.hgetall('/bots/' + req.params._bot.username + '/position', (err, res)=>{
                    if(err) return next(err);
                    if(!res){
                        return res.status(404).json({
                            error:{
                                message:"No `position` data found in redis"
                            }
                        });
                    }
                });
            })
            .then((position:any)=>{
                let range = 20;
                let worldData = {};
                return new Promise((resolve, reject)=> {
                    let multi = app.redis.clients.chaoscraft.multi();
                    for(let x = position.x - range; x <= position.x + range; x++){
                        //for(let y = position.y - range; y <= position.y + range; y++){
                            for(let z = position.z - range; z <= position.z + range; z++){
                                let key = '/world/blocks/top/' + x + '/' + z
                                multi.hgetall(key);
                            }
                        //}
                    }
                    return multi.exec((err, response)=>{
                        if(err){
                            return reject(err);
                        }
                        let i = 0;
                        for(let x = position.x - range; x <= position.x + range; x++){
                            worldData[x] =  worldData[x] || {};
                            //for(let y = position.y - range; y <= position.y + range; y++){
                                for(let z = position.z - range; z <= position.z + range; z++){
                                    i += 1;
                                    worldData[x][z] = response[i] || null;
                                }
                            //}
                        }
                        return resolve(worldData);
                    })
                })
            })
            .then((response)=>{
                return res.json(response);
            })
            .catch(next);




        })
        app.express.post('/bots/:bot', (req, res, next) => {
            //Load a brain
            if(!req.params._bot){
                return res.status(404).json({});
            }
            let errors = [];
            Object.keys(req.body).forEach((key)=>{
                switch(key){
                    case('username'):
                    case('name'):
                    case('alive'):
                    case('flagged'):
                    case('notes'):
                    case('spawnPriority'):
                        req.params._bot[key] = req.body[key];
                        break;
                    default:
                        errors.push(key + ' is an invalid parameter')
                }

            })
            /*if(errors.length > 0){
                return res.status(400).json({
                    error:{
                        message: errors.join(', ')
                    }
                })
            }*/
            return req.params._bot.save((err)=>{
                if(err) return next(err);
                return res.json(req.params._bot.toJSON());
            })


        })
        app.express.get('/bots/:bot/active', (req, res, next) => {
            //Load a brain

            if(!req.params._bot){
                return res.status(404).json({});
            }
            return app.redis.clients.chaoscraft.sismember('/active_bots',  req.params._bot.username, (err, active)=>{
                if(err) {
                    return next(err);
                }
                return res.json({active: active});
            })


        })
        app.express.get('/bots/:bot/brain', (req, res, next) => {
            //Load a brain
            if(!req.params._bot){
                return res.status(404).json({});
            }
            if(req.params._bot.username == 'adam-0'){
                return res.json(JSON.parse(fs.readFileSync('./adam.json').toString()));
            }
            return res.json(JSON.parse(req.params._bot.brain));

        })
        app.express.get('/bots/:bot/inventory', (req, res, next) => {
            //Load a brain
            if(!req.params._bot){
                return res.status(404).json({});
            }
            app.redis.clients.chaoscraft.get('/bots/' + req.params._bot.username + '/inventory', (err, results)=>{
                return res.json(JSON.parse(results));
            });
        })
        app.express.get('/bots/:bot/position', (req, res, next) => {
            //Load a brain
            if(!req.params._bot){
                return res.status(404).json({});
            }
            app.redis.clients.chaoscraft.hgetall('/bots/' + req.params._bot.username + '/position', (err, results)=>{
                if(err){
                    return next(err);
                }
                return res.json(results);
            });

        })




        app.express.get('/bots/:bot/stats', (req, res, next) => {
            //Load a brain
            if(!req.params._bot){
                return res.status(404).json({});
            }
            let multi = app.redis.clients.chaoscraft.multi();
            multi.hgetall('/bots/' + req.params._bot.username + '/stats');

            multi.exec((err, results)=>{
                try {
                    return res.json(/*JSON.parse*/(results[0]));
                }catch(e){
                    return next(e);
                }
            });



        });
        app.express.get('/stats', (req, res, next) => {
            //Load a brain

            let multi = app.redis.clients.chaoscraft.multi();
            //TODO: hunger / age
            let stat_keys = [
                'distance_traveled',
                'place_block',
                'place_block_attempt',
                'dig',
                'inventory',
                'inventory_ct',
                'health',
                'health_age',
                'food',
                'food_age',
                'attack',
                'craft',
                'craft_attempt',
                'loaded_count',
                'age',
                'equip',
                'equip_attempt',

            ]
            stat_keys.forEach((key)=>{
                multi.hgetall('/stats/' + key);
            })

            multi.exec((err, results)=>{
                let response = {}
                stat_keys.forEach((key, index)=>{
                    response[key] = results[index] || {};
                })
                return res.json(response);
            });



        });


        let minecraftData = MinecraftData(config.get('minecraft.version'))
        app.express.get('/translate', (req, res, next) => {
            //Load a brain
           let payload = {
               blocks:minecraftData.blocks,
               items:minecraftData.items,
               objects: minecraftData.objects,
               mobs: minecraftData.mobs,
               recipes: minecraftData.recipes

           }
            return res.json(payload);

        })
        const AWS = require('aws-sdk');
        AWS.config.apiVersions = {
            ecs: '2014-11-13',

            // other service API versions
        };


        var ecs = new AWS.ECS({ region: 'us-east-1'});
        var params = {
            cluster: "chaoscraft-minecraft-server",
            serviceName:"chaoscraft-minecraft-server"
        };
        var ec2 = new AWS.EC2({ region: 'us-east-1'});

        app.express.get('/servers', (req, res, next) => {
            if(process.env.SERVERS_OVERRIDE){
                return res.json([process.env.SERVERS_OVERRIDE]);
            }
            let p = new Promise((resolve, reject)=>{
                return ecs.listTasks(params, (err, data)=>{
                    if(err){
                        return reject(err);
                    }
                    return resolve(data);
                })
            })
            .then((data:any)=>{
                return new Promise((resolve, reject)=> {
                    let tasks = [];
                    data.taskArns.forEach((taskArn)=>{
                        tasks.push(
                            taskArn.replace('arn:aws:ecs:us-east-1:368590945923:task/', '')
                        );
                    })
                    ecs.describeTasks({
                        cluster: "chaoscraft-minecraft-server",
                        tasks: tasks
                    }, function (err, data) {
                        if (err) {
                            return reject(err);
                        }
                        return resolve(data);
                    });

                });

            })
            .then((data:any)=>{
                return new Promise((resolve, reject)=> {
                    var params = {
                        NetworkInterfaceIds: [ ]
                    };
                    data.tasks.forEach((taskData)=>{
                        taskData.attachments.forEach((attData)=>{
                            attData.details.forEach((detail)=>{
                                if(detail.name == 'networkInterfaceId'){
                                    params.NetworkInterfaceIds.push(detail.value)
                                }
                            })
                        })
                    })

                    ec2.describeNetworkInterfaces(params, function (err, data) {
                        if (err) {
                            return reject(err);
                        }
                        return resolve(data);
                    });

                });
            })
            .then((data:any)=>{
                let ips = [];
                data.NetworkInterfaces.forEach((networkInterface)=>{
                    ips.push(networkInterface.Association.PublicIp);
                })
                return res.json(ips)
            })
            .catch((err)=>{
                console.error(err.message, err.stack);
            })



        })



    }
}
export { Routes }