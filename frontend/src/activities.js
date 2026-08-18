// Single source of truth for activity metadata — both Home and
// ActivityChat read from here so adding a 4th activity later means
// editing one object, not two components.
export const ACTIVITIES = {
  brain_buster: {
    key: "brain_buster",
    title: "Brain Buster",
    tagline: "Riddles that make you think twice",
    emoji: "🧩",
    color: "#FF6459",
    mode: "json",
    hasHints: true,
    hasSkip: true,
    hasHistory: true,
    historyKey: "riddle_id", // JSON field used to detect "same puzzle vs new puzzle"
  },
  quick_fire: {
    key: "quick_fire",
    title: "Quick Fire",
    tagline: "Fast trivia across every subject",
    emoji: "⚡",
    color: "#06A77D",
    mode: "json",
    hasHints: false,
    hasSkip: true,
    hasHistory: true,
    historyKey: "topic",
  },
  ask_explore: {
    key: "ask_explore",
    title: "Ask & Explore",
    tagline: "Ask anything, discover something new",
    emoji: "🧭",
    color: "#5B5BD6",
    mode: "stream",
    hasHints: false,
    hasSkip: false,
    hasHistory: true,   // logs each question asked, no dedupe key needed for stream mode
    historyKey: null,
  },
};