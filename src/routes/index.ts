import { iBot } from '../models/Bot';
import { App } from '../App';
import * as fs from 'fs';
import * as errorHandler from 'errorhandler';
import * as bodyParser from 'body-parser';
import { BrainMaker } from '../services/BrainMaker'
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
                    {
                        _id: req.params.bot
                    },
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
        app.express.get('/brains/test', (req, res, next) => {
            let options = {
                length: req.body.length || 100,
                maxChainLength: req.body.maxChainLength || 10
            }
            let brainMaker = new BrainMaker();
            let brainData = brainMaker.create(options);
            return res.json(brainData);
        });
        app.express.post('/bots', (req, res, next) => {
            //Load a brain
            let options = {
                length: req.body.length || 100,
                maxChainLength: req.body.maxChainLength || 10
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
            return app.mongo.models.chaoscraft.Bot.find({
                //_id: req.param('id')
            }, (err:Error, brains:Array<iBot>)=>{
                if(err) {
                    return next(err);
                }
                return res.json(brains);
            })
        })

        app.express.get('/bots/active', (req, res, next) => {
            //Load a brain
            return app.redis.clients.chaoscraft.smembers('/active_bots', (err, botUsernames)=>{
                if(err) {
                    return next(err);
                }
                return res.json(botUsernames);
            })
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
            return res.json(JSON.parse(req.params._bot.brain));

        })

    }
}
export { Routes }