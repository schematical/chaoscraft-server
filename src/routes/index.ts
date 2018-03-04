import { IBrain } from '../models/Brain';
import { App } from '../App';
import * as fs from 'fs';
class Routes{
    static setup(app:App){
        app.express.use((req, res, next)=>{
            res.set('Access-Control-Allow-Origin', 'http://localhost:3000');
            return next();
        })
        app.express.get('/', (req, res) => res.send('Hello World!'));
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