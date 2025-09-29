"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuizBodySchema = exports.QuizAnswerSchema = void 0;
const zod_1 = __importDefault(require("zod"));
exports.QuizAnswerSchema = zod_1.default.object({
    id: zod_1.default.string(), // OBRIGATÓRIO
    value: zod_1.default.unknown(), // usa unknown/any conforme preferires
});
exports.QuizBodySchema = zod_1.default.object({
    answers: zod_1.default.array(exports.QuizAnswerSchema).nonempty(),
});
