// src/custom.d.ts

// declaração genérica para SVGs como URL (Vite já suporta ?url nativamente)
declare module '*.svg?url' {
  const src: string;
  export default src;
}

// mantém também a importação “normal” de SVG caso estejas a usar SVGs como componentes noutras partes
declare module '*.svg' {
  const src: string;
  export default src;
}
