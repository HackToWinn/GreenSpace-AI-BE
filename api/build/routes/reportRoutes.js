"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const reportControllers_1 = require("../controllers/reportControllers");
const router = (0, express_1.Router)();
router.get('/', reportControllers_1.getReports);
exports.default = router;
