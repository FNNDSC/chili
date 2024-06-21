"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchFeed = fetchFeed;
const node_fetch_1 = __importDefault(require("node-fetch"));
async function fetchFeed(url) {
    const response = await (0, node_fetch_1.default)(url);
    const data = await response.text();
    return data;
}
