import { Schema, Document } from "mongoose";

var BotSchema: Schema = new Schema({
    createdAt: Date,
    name:String,
    username:String,
    brain:String,
    generation:Number,
    age:Number,
    mother:{
        type: Schema.Types.ObjectId,
        ref: 'Brain'
    },
    father:{
        type: Schema.Types.ObjectId,
        ref: 'Brain'
    }
});

/*BotSchema.options.toObject.transform = function (doc, ret, options) {
    // remove the _id of every document before returning the result
    delete ret._id;
    return ret;
}*/

BotSchema.pre("save", function(next) {
    if (!this.createdAt) {
        this.createdAt = new Date();
    }
    next();
});
interface iBot extends Document {
    createdAt?: Date;
    name?: string;
    username?:string;
    brain?: string;
    generation?: string;
    age: Number,
    mother?: Schema.Types.ObjectId;
    father?: Schema.Types.ObjectId;
}

export {
    iBot,
    BotSchema
}