import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const badges = [
    // Selos
    { name: 'Primeiro Livro',        type: 'STAMP',   criteria: 'Ler e avaliar o primeiro livro.' },
    { name: '5 Leituras',            type: 'STAMP',   criteria: 'Concluir cinco livros diferentes.' },
    { name: 'Crítico Literário',     type: 'STAMP',   criteria: 'Fazer cinco avaliações com comentário.' },
    { name: 'Curioso',               type: 'STAMP',   criteria: 'Clique em 10 microconteúdos “Sabia que...”.' },
    { name: 'Leitor Frequente',      type: 'STAMP',   criteria: 'Ler três livros em sete dias consecutivos.' },
    { name: 'Explorador de Géneros', type: 'STAMP',   criteria: 'Ler, pelo menos, um livro de quatro géneros literários diferentes.' },
    { name: 'Pontual',               type: 'STAMP',   criteria: 'Participar em três eventos culturais reservados pela agenda.' },
    { name: 'Ilustrador de Palavras',type: 'STAMP',   criteria: 'Comentar cinco livros com ilustrações destacadas.' },
    { name: 'Boa Noite, Livro',      type: 'STAMP',   criteria: 'Ler três livros marcados como “Histórias para Dormir”.' },
    { name: 'Descobridor de Curiosidades', type: 'STAMP', criteria: 'Explorar cinco conteúdos de boas práticas sugeridos pelo chatbot.' },

    // Troféus
    { name: 'Mini Bibliófilo',        type: 'TROFÉU', criteria: 'Ler 10 livros.' },
    { name: 'Família Leitora',        type: 'TROFÉU', criteria: 'Todos os elementos da família registados leram pelo menos um livro.' },
    { name: 'Aventureiro Literário',  type: 'TROFÉU', criteria: 'Ler livros de aventura, fantasia e mistério.' },
    { name: 'Clube da Lareira',       type: 'TROFÉU', criteria: 'Participação em três eventos culturais com marcação prévia.' },
    { name: 'Contador de Histórias',  type: 'TROFÉU', criteria: 'Ter três comentários aprovados pelo bibliotecário como “comentário em destaque”.' },
    { name: 'Explorador Global',      type: 'TROFÉU', criteria: 'Ler livros de cinco países diferentes.' },
    { name: 'Meta Atingida',          type: 'TROFÉU', criteria: 'Cumprir três metas de leitura (configuradas pelo bibliotecário ou pelo sistema).' },
    { name: 'Embaixador da Leitura',  type: 'TROFÉU', criteria: 'Partilhar a plataforma com três novas famílias (via link).' },
    { name: 'Guardião da Biblioteca', type: 'TROFÉU', criteria: 'Atingir o nível máximo e ter cinco troféus anteriores.' },
  ];

  for (const badge of badges) {
    await prisma.badge.upsert({
      where: { name: badge.name },
      update: { type: badge.type, criteria: badge.criteria },
      create: badge,
    });
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
