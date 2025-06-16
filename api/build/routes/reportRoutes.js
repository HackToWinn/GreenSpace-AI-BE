"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const reportControllers_1 = require("../controllers/reportControllers");
const multer_1 = __importDefault(require("multer"));
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        }
        else {
            cb(new Error('Only image files are allowed'));
        }
    },
});
const router = (0, express_1.Router)();
router.get('/', reportControllers_1.getValidReports); // ok
router.post('/image-upload', upload.single('image'), reportControllers_1.processImage); //ok
router.get('/this-week', reportControllers_1.getReportsThisWeek); //ok
exports.default = router;
