import mongoose from "mongoose";

const formSchema = mongoose.Schema({
    email:{
        type:String,
        required:true
    },
    name:{
        type:String,
        required:true
    },
    advSetlDate:{
        type:String,
        required:true
    },
    area:{
        type:String,
        required:true
    },
    placeProg:{
        type:String,
        required:true
    },
    project:{
        type:String,
        required:true
    },
    prjCode:{
        type:String,
        required:true
    },
    coversheet:{
        type:String,
        required:true
    },
    dateProg:{
        type:String,
        required:true
    },
    progTitle:{
        type:String,
        required:true
    },
    summary:{
        type:String,
        required:true
    },
    food:{
        type:Number,
        required:true
    },
    travel:{
        type:Number,
        required:true
    },
    stationery:{
        type:Number,
        required:true
    },
    printing:{
        type:Number,
        required:true
    },
    accom:{
        type:Number,
        required:true
    },
    communication:{
        type:Number,
        required:true
    },
    resource:{
        type:Number,
        required:true
    },
    other:{
        type:Number,
        required:true
    },
    total:{
        type:Number,
        required:true
    },
    inword:{
        type:String,
        required:true
    },
    vendor:{
        type:Number,
        required:true
    },
    individual:{
        type:Number,
        required:true
    },
    totalAdvTake:{
        type:Number,
        required:true
    },
    receivable:{
        type:Number,
        required:true
    },
    files: [{
        type: Buffer,
    }]
});

const SettelmentData = mongoose.model('SettelmentData',formSchema)

export default SettelmentData;