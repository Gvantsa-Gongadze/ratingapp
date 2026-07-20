import { useEffect, useRef, useState } from 'react';

export function Countdown({ deadlineAt, onExpire }: { deadlineAt: string; onExpire: () => void }) {
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  const [remainingMs, setRemainingMs] = useState(() => new Date(deadlineAt).getTime() - Date.now());

  useEffect(() => {
    const deadline = new Date(deadlineAt).getTime();
    setRemainingMs(deadline - Date.now());

    const intervalId = setInterval(() => {
      const remaining = deadline - Date.now();
      setRemainingMs(remaining);
      if (remaining <= 0) {
        onExpireRef.current();
        clearInterval(intervalId);
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [deadlineAt]);

  if (remainingMs <= 0) {
    return <p className="countdown countdown-expired">Time's up — fetching a new movie…</p>;
  }

  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <p className="countdown">
      {pad(hours)}:{pad(minutes)}:{pad(seconds)} left
    </p>
  );
}
