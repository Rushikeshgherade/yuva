import express from "express";
import { addSettelment, downloadPDF } from "../controller/settelment.controller.js";

const router = express.Router()

router.post("/addForm", addSettelment)

router.get('/api/download-pdf', downloadPDF);

export default router;  