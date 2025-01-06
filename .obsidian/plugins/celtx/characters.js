"use strict";
// src/characters.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.addCharacter = addCharacter;
exports.getCharacterName = getCharacterName;
function addCharacter(name, role, age) {
    return { name, role, age };
}
function getCharacterName(character) {
    return character.name;
}
