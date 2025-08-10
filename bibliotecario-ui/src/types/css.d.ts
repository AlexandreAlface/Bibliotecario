// src/types/styles.d.ts
declare module '*.module.scss' {
  const classes: { [key: string]: string };
  export default classes;
}
declare module '*.scss';      // se também importar scss “normal”
declare module '*.css';

