import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/global.css';
import { iniciarPwa } from './pwa/pwa';

// Antes do React: o convite de instalação pode chegar já no carregamento
iniciarPwa();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
