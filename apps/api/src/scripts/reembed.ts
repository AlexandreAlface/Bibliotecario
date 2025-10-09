import { reembedBooks } from "../reco/embeddings-books.js";

(async () => {
  let total = 0;
  while (true) {
    const changed = await reembedBooks(500);
    total += changed;
    if (changed === 0) break; // acabou
  }
  console.log(`Terminado. Livros re-embutidos: ${total}`);
})();
