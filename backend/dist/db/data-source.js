"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDataSource = void 0;
require("reflect-metadata");
const typeorm_1 = require("typeorm");
const Intent_1 = require("../entities/Intent");
exports.AppDataSource = new typeorm_1.DataSource({
    type: 'postgres',
    url: process.env.Db_URL || process.env.DATABASE_URL,
    synchronize: true, // AUTO schema sync — no migrations
    logging: false,
    entities: [Intent_1.Intent],
});
