"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const consultations_1 = __importDefault(require("./consultations"));
const slots_1 = __importDefault(require("./slots"));
const proposals_1 = __importDefault(require("./proposals"));
const r = (0, express_1.Router)();
r.use(consultations_1.default); // /consultations, /consultations/:id/...
r.use(slots_1.default); // /librarians/:librarianId/slots, /slots/:id
r.use(proposals_1.default); // /consultations/:id/proposals, /proposals/:proposalId/...
exports.default = r;
