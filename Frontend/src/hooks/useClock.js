import { useState, useEffect } from 'react';

const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

export function useClock() {
  const [time, setTime] = useState('00:00:00');
  const [date, setDate] = useState('');

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const h   = String(now.getUTCHours()).padStart(2, '0');
      const m   = String(now.getUTCMinutes()).padStart(2, '0');
      const s   = String(now.getUTCSeconds()).padStart(2, '0');
      setTime(`${h}:${m}:${s}`);
      const day = String(now.getUTCDate()).padStart(2, '0');
      setDate(`${day} ${MONTHS[now.getUTCMonth()]} ${now.getUTCFullYear()} UTC`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return { time, date };
}
