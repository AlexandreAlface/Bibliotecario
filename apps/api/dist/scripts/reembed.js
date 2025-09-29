"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const embeddings_books_js_1 = require("../reco/embeddings-books.js");
(async () => {
    let total = 0;
    while (true) {
        const changed = await (0, embeddings_books_js_1.reembedBooks)(500);
        total += changed;
        if (changed === 0)
            break; // acabou
    }
    console.log(`Terminado. Livros re-embutidos: ${total}`);
})();
