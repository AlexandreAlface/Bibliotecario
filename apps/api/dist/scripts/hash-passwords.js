"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// node scripts/hash-passwords.js
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
function isHashed(pwd) {
    return typeof pwd === 'string' && (pwd.startsWith('$2a$') || pwd.startsWith('$2b$') || pwd.startsWith('$2y$'));
}
async function main() {
    const users = await prisma.user.findMany({ select: { id: true, email: true, passwordHash: true } });
    let updated = 0;
    for (const u of users) {
        if (!isHashed(u.passwordHash)) {
            const hashed = await bcryptjs_1.default.hash(String(u.passwordHash), 12);
            await prisma.user.update({
                where: { id: u.id },
                data: { passwordHash: hashed }
            });
            console.log(`✔ Hashed ${u.email}`);
            updated++;
        }
    }
    if (updated === 0)
        console.log('Nada para atualizar. Todas as passwords já estão hashed.');
}
main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
