import express from "express"
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import cors from 'cors'
import addSettelment from "./route/stl.js"
import { downloadPDF } from "./controller/settelment.controller.js"

const app = express()
// Configure CORS to allow requests from your frontend domain
app.use(cors());
app.use(express.json());
dotenv.config()

const PORT =process.env.PORT || 8080;
const URI=process.env.MONGO_URI;

try {
    mongoose.connect(URI,{
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
    console.log("Connection done succefuly to db")
} catch (error) {
    console.log("Error:",error)
    
}
app.get("/",(req,res) => {
  res.send("Hello Word")
});

app.use("/settelment",addSettelment)
app.use("/pdf",downloadPDF)
app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`)
})