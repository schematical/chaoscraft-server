import * as config from 'config';
import * as mongoose from 'mongoose';
import { BotSchema } from '../models/Bot';
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
        this._models.chaoscraft.Bot = this.db.chaoscraft.model('Bot', BotSchema);

    }
    get models():any{
        return this._models;
    }
}
export { Mongoose }