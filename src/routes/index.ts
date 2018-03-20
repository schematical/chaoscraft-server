import { iBot } from '../models/Bot';
import { App } from '../App';
import * as _ from 'underscore';
import * as errorHandler from 'errorhandler';
import * as bodyParser from 'body-parser';
import { BrainMaker } from '../services/BrainMaker'
import * as fs from 'fs';
import * as MinecraftData from 'minecraft-data'
import * as config from 'config';
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
            res.set('Access-Control-Allow-Headers', 'true');
            res.set('Access-Control-Allow-Credentials', 'true');
            res.set('Access-Control-Allow-Origin', 'http://localhost:4200');
            return next();
        })
        app.express.get('/', (req, res) => res.send('Hello World!'));
        app.express.get('/bots/:bot/test', (req, res, next) => {
            if(!req.params._bot){
                return res.status(404).json({});
            }
            let options = {
                brainData: JSON.parse(req.params._bot.brain),
                generation: req.params._bot.generation
            }
            let brainMaker = new BrainMaker();
            let brainData = brainMaker.create(options);


            return res.json(brainData);
        });
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
                        return res.json(botUsernames);
                    })
                })

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







        let minecraftData = MinecraftData(config.get('minecraft.version'))
        app.express.get('/translate', (req, res, next) => {
            //Load a brain
           let payload = {
               blocks:minecraftData.blocks,
               items:minecraftData.items,
               objects: minecraftData.objects,
               mobs: minecraftData.mobs

           }
            return res.json(payload);

        })


    }
}
export { Routes }