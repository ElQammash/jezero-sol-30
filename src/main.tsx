import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

// ?shot=1 hides all interface for clean cinematic captures (docs, deck, submission images)
if (new URLSearchParams(location.search).has('shot')) document.body.classList.add('shot-mode');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
