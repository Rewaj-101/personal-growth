import { useEffect, useState } from "react";

function Countdown() {
  // Change this time to your surprise time
  const surpriseTime = new Date("2026-05-21T21:00:00+05:30").getTime();

  const [timeLeft, setTimeLeft] = useState(surpriseTime - new Date().getTime());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(surpriseTime - new Date().getTime());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (timeLeft <= 0) {
    return (
      <div className="countdown-box">
        <h1>💖 Surprise Time 💖</h1>
        <p>Open your heart, my love. This is for you 🥹</p>
        <button onClick={() => window.location.href = "/surprise"}>
          Open Surprise
        </button>
      </div>
    );
  }

  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeLeft / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((timeLeft / (1000 * 60)) % 60);
  const seconds = Math.floor((timeLeft / 1000) % 60);

  return (
    <div className="countdown-box">
      <h1>Our Anniversary Surprise Starts In 💕</h1>

      <div className="timer">
        <div>
          <span>{days}</span>
          <p>Days</p>
        </div>
        <div>
          <span>{hours}</span>
          <p>Hours</p>
        </div>
        <div>
          <span>{minutes}</span>
          <p>Minutes</p>
        </div>
        <div>
          <span>{seconds}</span>
          <p>Seconds</p>
        </div>
      </div>

      <p className="message">
        Wait a little more, my love. Something special is coming for you 🥰
      </p>
    </div>
  );
}

export default Countdown;