import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/tailwind.css';
import './styles/aero-spec-hud.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Failed to find root DOM element #root to mount Aero-Spec cockpit.');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
