"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/server.ts
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const intent_routes_1 = __importDefault(require("./routes/intent.routes"));
const solver_routes_1 = __importDefault(require("./routes/solver.routes"));
const rewards_routes_1 = __importDefault(require("./routes/rewards.routes"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use('/api/intent', intent_routes_1.default);
app.use('/api/solver', solver_routes_1.default);
app.use('/api/rewards', rewards_routes_1.default);
app.get('/', (req, res) => res.json({ status: 'Portal Backend Live' }));
exports.default = app;
