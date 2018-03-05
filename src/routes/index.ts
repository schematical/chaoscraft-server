import { IBrain } from '../models/Brain';
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
        app.express.post('/brains', (req, res, next) => {
            //Load a brain
            let brain = app.mongo.models.chaoscraft.Brain({
                name:"Adam",
                brain: fs.readFileSync('/home/user1a/WebstormProjects/schematical-chaoscraft/bot/brain1.json').toString(),
                generation:0
            })
            brain.name = "Test";
            brain.save((err:Error, brain:IBrain)=>{
                if(err) {
                    return next(err);
                }
                return res.json(brain.toJSON());
            })
        })
        app.express.get('/brains', (req, res, next) => {
            //Load a brain
            return app.mongo.models.chaoscraft.Brain.find({
                //_id: req.param('id')
            }, (err:Error, brains:Array<IBrain>)=>{
                if(err) {
                    return next(err);
                }
                return res.json(brains);
            })
        })
        app.express.get('/brains/:brain', (req, res, next) => {
            //Load a brain
            return app.mongo.models.chaoscraft.Brain.findOne({
                _id: req.param('id')
            }, (err:Error, brain:IBrain)=>{
                if(err) {
                    return next(err);
                }
                return res.json(brain.toJSON());
            })
        })
    }
}
export { Routes }