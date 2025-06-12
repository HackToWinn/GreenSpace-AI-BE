"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = useActor;
const backend_1 = require("../../../src/declarations/backend");
function useActor() {
    const actor = (0, backend_1.createActor)(backend_1.canisterId);
    return actor;
}
