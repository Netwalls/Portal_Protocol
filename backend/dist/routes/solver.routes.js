"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/solver.routes.ts
const express_1 = require("express");
const solver_controller_1 = require("../controllers/solver.controller");
const router = (0, express_1.Router)();
router.post('/register', solver_controller_1.registerSolver);
router.post('/settle', solver_controller_1.triggerSettlement);
router.get('/status/:address', solver_controller_1.getSolverStatus);
exports.default = router;
