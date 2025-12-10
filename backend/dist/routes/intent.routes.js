"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/intent.routes.ts
const express_1 = require("express");
const intent_controller_1 = require("../controllers/intent.controller");
const router = (0, express_1.Router)();
router.post('/commit', intent_controller_1.commitIntent);
router.get('/:intentHash', intent_controller_1.getIntentStatus);
exports.default = router;
