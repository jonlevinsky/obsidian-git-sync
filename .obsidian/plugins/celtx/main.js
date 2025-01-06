"use strict";
// src/main.ts
Object.defineProperty(exports, "__esModule", { value: true });
const locations_1 = require("./locations");
const characters_1 = require("./characters");
class MyPlugin extends Plugin {
    onload() {
        const location = (0, locations_1.addLocation)('Mysterious Forest', 'A dense and eerie forest.', '45.123, 23.456');
        const character = (0, characters_1.addCharacter)('Durkovič', 'Historian', 45);
        console.log('Location:', (0, locations_1.getLocationName)(location));
        console.log('Character:', (0, characters_1.getCharacterName)(character));
    }
}
exports.default = MyPlugin;
