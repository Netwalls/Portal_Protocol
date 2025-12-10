"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/index.ts
const server_1 = __importDefault(require("./server"));
const data_source_1 = require("./db/data-source");
// NOTE: we import the contract listener after DB initialization below so
// event handlers can safely persist events. Do not import contract.service here.
const PORT = process.env.PORT || 3001;
async function startServer() {
    await data_source_1.AppDataSource.initialize();
    console.log('DB connected (TypeORM)');
    // Import contract service after DB is ready so event handlers can use the DB
    // (dynamic import used to avoid top-level ordering issues)
    await Promise.resolve().then(() => __importStar(require('./services/contract.service')));
    server_1.default.listen(PORT, () => {
        console.log(`Backend running on :${PORT}`);
    });
}
startServer().catch((err) => {
    console.error('DB failed to init', err);
    process.exit(1);
});
