import * as config from 'config';
import * as mongoose from 'mongoose';
import { BrainSchema } from './models/Brain';
class Mongoose{
    protected db:any = {};
    protected _models:any = {};
    constructor(){
        let mongoConfig = config.get('mongo');

        Object.keys(mongoConfig).forEach((key)=>{
            this.db[key] = mongoose.createConnection(mongoConfig[key].url, {
                user: mongoConfig[key].user,
                pass: mongoConfig[key].pass
            });
            this._models[key] = {};
        })
        this._models.chaoscraft.Brain = this.db.chaoscraft.model('Brain', BrainSchema);

    }
    get models():any{
        return this._models;
    }
}
export { Mongoose }