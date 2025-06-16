"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = useActor;
const backend_1 = require("../../../src/declarations/backend");
const icrc1_1 = require("../../../src/declarations/icrc1");
function useActor(_a) {
    return __awaiter(this, arguments, void 0, function* ({ type }) {
        const actor = (0, backend_1.createActor)(type === 'Backend' ? backend_1.canisterId : icrc1_1.canisterId, {
            agentOptions: {
                host: 'http://127.0.0.1:4943',
            },
        });
        return actor;
    });
}
