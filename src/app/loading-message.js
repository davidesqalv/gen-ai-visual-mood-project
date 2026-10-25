import { useEffect, useRef, useState } from "react";

// What to say while the shader is cooking. Grouped by what's actually going
// on: the backend streams "thinking", then "writing" with a line count, and
// "fixing" is the browser sending a broken shader back.
const MESSAGES = {
  sending: [
    "waking up the GPU goblins",
    "bribing the server with candy corn",
    "lighting the candles",
  ],
  thinking: [
    "combobulating",
    "consulting the vibes",
    "reading your aura (it's beige)",
    "asking the pumpkin for a second opinion",
    "googling 'what is a vector'",
    "staring into the void. the void blinked",
    "overthinking it, as is tradition",
  ],
  writing: [
    "typing very fast",
    "making sure the pixels align",
    "declaring noise functions nobody asked for",
    "hand-tuning sine waves",
    "teaching vectors to dance",
    "adding one more for-loop",
  ],
  fixing: [
    "explaining '{culprit}' to the GPU",
    "the GPU said no",
    "blaming the compiler",
    "pretending that was on purpose",
    "recombobulating",
  ],
};

// How long a message stays up, the least it stays up when the stage changes,
// and how long it takes to fade out
const ROTATE_MS = 3500;
const MIN_MS = 2000;
const FADE_MS = 300;

function messageText(stage, index, culprit) {
  const pool = MESSAGES[stage] || MESSAGES.sending;
  return pool[index % pool.length].replace(
    "'{culprit}'",
    culprit ? `'${culprit}'` : "itself"
  );
}

// One message at a time, fading between them. progress: { stage, lines, culprit }
export default function LoadingMessage({ progress }) {
  const [shown, setShown] = useState({ stage: progress.stage, index: 0 });
  const [leaving, setLeaving] = useState(false);
  const shownAt = useRef(0);

  useEffect(() => {
    if (!shownAt.current) shownAt.current = Date.now();
    const stageChanged = progress.stage !== shown.stage;
    const wait = stageChanged
      ? Math.max(0, MIN_MS - (Date.now() - shownAt.current))
      : ROTATE_MS;

    let swap;
    const fade = setTimeout(() => {
      setLeaving(true);
      swap = setTimeout(() => {
        shownAt.current = Date.now();
        setShown(
          stageChanged
            ? { stage: progress.stage, index: 0 }
            : { stage: shown.stage, index: shown.index + 1 }
        );
        setLeaving(false);
      }, FADE_MS);
    }, wait);

    return () => {
      clearTimeout(fade);
      clearTimeout(swap);
    };
  }, [progress.stage, shown]);

  const text = messageText(shown.stage, shown.index, progress.culprit);
  return (
    <div style={{ color: "white" }}>
      <span
        key={`${shown.stage}-${shown.index}`}
        className={leaving ? "loading-message leaving" : "loading-message"}
      >
        {text}...
        {shown.stage === "writing" && ` line ${progress.lines}`}
      </span>
    </div>
  );
}
