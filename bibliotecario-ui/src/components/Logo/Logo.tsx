import React from 'react';
import logoPng from './Logo.png';
import './Logo.css';

const Logo: React.FC = () => (
  <div className="logo">
    <img className="logo__img" src={logoPng} alt="BLIFA — Bibliotecário de Família" />
  </div>
);

export default Logo;
export { Logo };
