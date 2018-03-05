import { Schema, Document } from "mongoose";

var BrainSchema: Schema = new Schema({
    createdAt: Date,
    name:String,
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

BrainSchema.pre("save", function(next) {
    if (!this.createdAt) {
        this.createdAt = new Date();
    }
    next();
});
interface IBrain extends Document {
    createdAt?: Date;
    name?: string;
    brain?: string;
    generation?: string;
    age: Number,
    mother?: Schema.Types.ObjectId;
    father?: Schema.Types.ObjectId;
}

export {
    IBrain,
    BrainSchema
}