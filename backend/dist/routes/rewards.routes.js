"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/rewards.routes.ts
const express_1 = require("express");
const rewards_controller_1 = require("../controllers/rewards.controller");
const router = (0, express_1.Router)();
router.get('/pending/:address', rewards_controller_1.getPendingRewards);
router.post('/claim', rewards_controller_1.claimRewards);
exports.default = router;
