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

// progress: { stage, lines, culprit }; tick rotates through the messages
export function loadingMessage({ stage, lines, culprit }, tick) {
  const pool = MESSAGES[stage] || MESSAGES.sending;
  const message = pool[tick % pool.length].replace(
    "'{culprit}'",
    culprit ? `'${culprit}'` : "itself"
  );
  return stage === "writing" ? `${message}... line ${lines}` : `${message}...`;
}
