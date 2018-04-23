import { Schema, Document } from "mongoose";

var BotSchema: Schema = new Schema({
    createdAt: Date,
    name:String,
    username:String,
    brain:String,
    generation:Number,
    age:{
        type:Number,
        default: 0
    },
    spawnCount: {
        type: Number,
        default:0
    },
    mother:{
        type: Schema.Types.ObjectId,
        ref: 'Brain'
    },
    father:{
        type: Schema.Types.ObjectId,
        ref: 'Brain'
    },
    alive: {
        type: Boolean,
        default: true
    },
    notes:{
        type: String
    },
    achivements:{
        type:Schema.Types.Mixed,
        defaut: {
            being_born: 1
        }
    },
    flagged:{
        type:Boolean,
        default: false
    },
    spawnPriority:{
        type:Number,
        default: 1
    }
});
let options = (<any>BotSchema).options;
options.toObject = options.toObject || {};
options.toObject.transform = function (doc, ret, options) {
    // remove the _id of every document before returning the result
    delete ret.brain;
    return ret;
}

BotSchema.pre("save", function(next) {
    let _this = <any>this;
    if (!_this.createdAt) {
        _this.createdAt = new Date();
    }
    next();
});
interface iBot extends Document {
    createdAt?: Date;
    name?: string;
    username?:string;
    brain?: string;
    generation?: number;
    age: number,
    mother?: Schema.Types.ObjectId;
    father?: Schema.Types.ObjectId;
    alive:boolean;
    notes:string,
    achivements:any,
    spawnCount:number,
    flagged:boolean,
    spawnPriority:number
}

export {
    iBot,
    BotSchema
}