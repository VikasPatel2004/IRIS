import { useState, useEffect } from 'react';
import { FIRMS_API } from '../constants/api.js';

function demoFires(count) {
  return Array.from({ length: count }, () => ({
    lat: 15 + Math.random() * 20,
    lon: 70 + Math.random() * 20,
    intensity: 250 + Math.random() * 300,
  }));
}

export function useSatFires() {
  const [fires, setFires]     = useState([]);
  const [loaded, setLoaded]   = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res  = await fetch(FIRMS_API);
        const data = await res.json();
        const list = data.fires || [];
        setFires(list.length > 0 ? list : demoFires(150));
      } catch {
        setFires(demoFires(150));
      } finally {
        setLoaded(true);
      }
    };
    load();
    // Refresh every 5 minutes
    const id = setInterval(load, 300_000);
    return () => clearInterval(id);
  }, []);

  return { fires, loaded };
}
