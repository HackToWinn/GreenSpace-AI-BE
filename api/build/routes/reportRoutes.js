"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const reportControllers_1 = require("../controllers/reportControllers");
const uploadImageMulter_1 = require("../utils/uploadImageMulter");
const router = (0, express_1.Router)();
router.get('/', reportControllers_1.getValidReports); // ok
router.post('/create', uploadImageMulter_1.upload.single('image'), reportControllers_1.processImage); //ok
router.get('/week', reportControllers_1.getReportsThisWeek); //ok
router.get('/most/category', reportControllers_1.getMostReportedCategory); //ok
router.get('/:id', reportControllers_1.getReportById); //ok
router.get('/latest', reportControllers_1.getLatestReports); //ok
router.post('/my-report', uploadImageMulter_1.upload.none(), reportControllers_1.getMyReport); //ok
exports.default = router;
