"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const script1_1 = require("./script1");
const script2_1 = require("./script2");
class MyPlugin extends Plugin {
    onload() {
        // Inicializace pluginu
        (0, script1_1.someFunction)();
        (0, script2_1.anotherFunction)();
    }
}
exports.default = MyPlugin;
