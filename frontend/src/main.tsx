import React from 'react';
import ReactDOM from 'react-dom/client';

function App() {
  return (
    <main>
      <h1>CodeClimb</h1>
      <p>Frontend skeleton is ready.</p>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
