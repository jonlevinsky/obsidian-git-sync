"use strict";
// src/locations.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.addLocation = addLocation;
exports.getLocationName = getLocationName;
function addLocation(name, description, coordinates) {
    return { name, description, coordinates };
}
function getLocationName(location) {
    return location.name;
}
