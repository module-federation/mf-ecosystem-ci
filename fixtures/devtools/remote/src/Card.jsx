import { useState } from 'react';

export default function Card({ title = 'untitled' }) {
  const [clicks, setClicks] = useState(0);
  return (
    <section data-testid="dt-remote-card">
      <h2>dt_remote card: {title}</h2>
      <button type="button" onClick={() => setClicks((n) => n + 1)}>
        clicked {clicks}
      </button>
    </section>
  );
}
