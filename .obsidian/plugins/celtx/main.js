"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const locations_1 = __importDefault(require("./locations"));
const plugin = new locations_1.default(app);
// Now you can use the plugin's methods, e.g., to get locations
const locations = await plugin.getLocationFiles(someFolderPath);
console.log(locations);
