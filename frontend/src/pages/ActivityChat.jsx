import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";

import { ACTIVITIES } from "../activities.js";

import {
  sendStreamingMessage,
  endSession,
} from "../api.js";

import { useInactivityTimer } from "../hooks/useInactivityTimer.js";

const IDLE_TIMEOUT_MS = 60 * 1000;

const MAX_HINTS = 3;

export default function ActivityChat({
  activityKey,
  onBack,
  onSelect,
  globalHistory,
  addGlobalHistory,
}) {
  const meta = ACTIVITIES[activityKey];

  const sessionId = useRef(
    crypto.randomUUID()
  );

  const hasStarted = useRef(false);

  const sendingRef = useRef(false);

  const scrollRef = useRef(null);

  const [messages, setMessages] =
    useState([]);

  const [input, setInput] =
    useState("");

  const [busy, setBusy] =
    useState(false);

  const [lastMeta, setLastMeta] =
    useState(null);

  const goHome = useCallback(
    async () => {
      try {
        await endSession(
          sessionId.current
        );
      } catch (error) {
        console.error(
          "End session error:",
          error
        );
      }

      onBack();
    },
    [onBack]
  );

  const { reset: resetIdleTimer, secondsLeft } =
    useInactivityTimer(
      IDLE_TIMEOUT_MS,
      goHome
    );

  useEffect(() => {
    if (!scrollRef.current) {
      return;
    }

    scrollRef.current.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const sendTurn = useCallback(
    async (userText) => {
      if (sendingRef.current) {
        return;
      }

      sendingRef.current = true;

      setBusy(true);

      resetIdleTimer();

      const cleanText =
        userText?.trim() || "";

      if (cleanText) {
        setMessages((previous) => [
          ...previous,
          {
            role: "user",
            text: cleanText,
          },
        ]);
      }

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          text: "",
          streaming: true,
        },
      ]);

      let streamedText = "";

      try {
        await sendStreamingMessage(
          sessionId.current,
          activityKey,
          cleanText || "start",

          (token) => {
            streamedText += token;

            if (meta.mode === "stream") {
              setMessages(
                (previous) => {
                  const copy = [
                    ...previous,
                  ];

                  const index =
                    copy.length - 1;

                  copy[index] = {
                    ...copy[index],
                    text: streamedText,
                    streaming: true,
                  };

                  return copy;
                }
              );
            }
          },

          () => {
            if (meta.mode === "json") {
              let parsedData;

              try {
                parsedData =
                  JSON.parse(
                    streamedText
                  );
              } catch (error) {
                console.error(
                  "JSON parsing failed:",
                  streamedText,
                  error
                );

                setMessages(
                  (previous) => {
                    const copy = [
                      ...previous,
                    ];

                    const index =
                      copy.length - 1;

                    copy[index] = {
                      role: "assistant",
                      text:
                        "Sorry, I could not understand that response.",
                      streaming: false,
                    };

                    return copy;
                  }
                );

                return;
              }

              setLastMeta(
                parsedData
              );

              setMessages(
                (previous) => {
                  const copy = [
                    ...previous,
                  ];

                  const index =
                    copy.length - 1;

                  copy[index] = {
                    role: "assistant",
                    text:
                      parsedData.message ||
                      "",
                    meta: parsedData,
                    streaming: false,
                  };

                  return copy;
                }
              );

              if (cleanText) {
                addGlobalHistory({
                  activity:
                    activityKey,

                  userText:
                    cleanText,

                  assistantText:
                    parsedData.message ||
                    "",
                });
              }

              return;
            }

            setMessages(
              (previous) => {
                const copy = [
                  ...previous,
                ];

                const index =
                  copy.length - 1;

                copy[index] = {
                  role: "assistant",
                  text: streamedText,
                  streaming: false,
                };

                return copy;
              }
            );

            if (cleanText) {
              addGlobalHistory({
                activity:
                  activityKey,

                userText:
                  cleanText,

                assistantText:
                  streamedText,
              });
            }
          }
        );
      } catch (error) {
        console.error(
          "Chat error:",
          error
        );

        setMessages(
          (previous) => {
            const copy = [
              ...previous,
            ];

            const index =
              copy.length - 1;

            copy[index] = {
              role: "assistant",
              text:
                "Oops! Something went wrong. Please try again.",
              streaming: false,
            };

            return copy;
          }
        );
      } finally {
        setBusy(false);

        sendingRef.current = false;

        resetIdleTimer();
      }
    },
    [
      activityKey,
      meta.mode,
      addGlobalHistory,
      resetIdleTimer,
    ]
  );

  useEffect(() => {
    if (hasStarted.current) {
      return;
    }

    hasStarted.current = true;

    void sendTurn("");
  }, [sendTurn]);

  function handleSubmit(event) {
    event.preventDefault();

    if (busy) {
      return;
    }

    const text = input.trim();

    if (!text) {
      return;
    }

    setInput("");

    void sendTurn(text);
  }

  const hintsGiven =
    lastMeta?.hints_given ?? 0;

  const hintsLeft =
    Math.max(
      0,
      MAX_HINTS - hintsGiven
    );

  return (
    <div className="min-h-screen flex">

      <aside className="w-72 border-r border-ink/10 bg-white px-5 py-6 hidden md:block h-screen sticky top-0 overflow-y-auto">

        <h2 className="font-display text-lg font-bold text-ink flex items-center gap-2 mb-2">
          🕐 Journey History
        </h2>

        <p className="text-xs text-ink/40 mb-5">
          Your 6 most recent conversations
        </p>

        {globalHistory.length === 0 && (
          <p className="text-sm text-ink/40">
            Nothing yet.
          </p>
        )}

        <div className="space-y-3">

          {globalHistory
            .slice()
            .reverse()
            .map((entry) => {

              const activity =
                ACTIVITIES[
                  entry.activity
                ];

              return (
                <button
                  key={entry.id}
                  type="button"

                  onClick={() => {
                    if (entry.activity !== activityKey) {
                      onSelect(entry.activity);
                    }
                  }}

                  className="w-full text-left rounded-xl border-l-4 bg-paper/60 px-3 py-3 hover:bg-paper transition cursor-pointer"
                  style={{
                    borderColor:
                      activity?.color ||
                      meta.color,
                  }}
                >

                  <div
                    className="text-xs font-semibold mb-1"
                    style={{
                      color:
                        activity?.color ||
                        meta.color,
                    }}
                  >
                    {activity?.emoji}{" "}
                    {activity?.title}
                  </div>

                  <p className="text-xs font-semibold text-ink/70">
                    {entry.userText}
                  </p>

                  <p className="text-xs text-ink/50 mt-1 line-clamp-2">
                    {entry.assistantText}
                  </p>

                  <p className="text-[10px] text-ink/30 mt-2">
                    {new Date(
                      entry.timestamp
                    ).toLocaleTimeString(
                      [],
                      {
                        hour: "numeric",
                        minute: "2-digit",
                      }
                    )}
                  </p>

                </button>
              );
            })}

        </div>

      </aside>

      <div className="flex-1 flex flex-col">

        <header className="flex items-center gap-4 px-6 py-4 shadow-sm sticky top-0 bg-white z-10">

          <button
            onClick={goHome}
            className="flex items-center gap-1.5 text-sm font-semibold text-white px-4 py-2 rounded-full"
            style={{
              backgroundColor:
                meta.color,
            }}
          >
            ← Back to Home
          </button>

          <div className="flex-1 flex items-center justify-center gap-2">

            <span className="text-2xl">
              {meta.emoji}
            </span>

            <h1 className="font-display text-xl font-bold text-ink">
              {meta.title}
            </h1>

          </div>

          <div className="w-32 flex justify-end">
            <span
              className="inline-flex items-center gap-1 text-xs font-semibold text-ink/50 bg-paper rounded-full px-3 py-1.5"
              title="Session ends after 60s of inactivity"
            >
              ⏱ {secondsLeft}s
            </span>
          </div>

        </header>

        <main
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-6 py-6 space-y-4 max-w-2xl w-full mx-auto"
        >

          {messages.map(
            (message, index) => (
              <Bubble
                key={index}
                message={message}
                color={meta.color}
              />
            )
          )}

          {busy && (
            <TypingDots
              color={meta.color}
            />
          )}

        </main>

        {meta.hasHints && (
          <div className="max-w-2xl w-full mx-auto px-6 flex items-center gap-3 mb-1">

            <button
              onClick={() =>
                sendTurn(
                  "Can I have a hint please?"
                )
              }
              disabled={
                busy ||
                hintsLeft === 0
              }
              className="rounded-full px-5 py-2 text-sm font-semibold text-white disabled:opacity-40"
              style={{
                backgroundColor:
                  "#F5B700",
              }}
            >
              💡 Ask for a Hint (
              {hintsLeft} Left)
            </button>

            <span className="text-sm text-ink/40">
              Stuck? Let{" "}
              {meta.emoji}{" "}
              {meta.title} throw you
              a clue.
            </span>

          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="border-t border-ink/10 bg-white px-6 py-4 sticky bottom-0"
        >

          <div className="max-w-2xl mx-auto flex gap-3">

            <input
              value={input}
              disabled={busy}
              onChange={(event) => {
                setInput(
                  event.target.value
                );

                resetIdleTimer();
              }}
              placeholder={
                "Type your answer here..."
              }
              className="flex-1 rounded-full border-2 border-ink/10 px-5 py-3 font-body focus:outline-none focus:border-ink/30 disabled:opacity-50"
            />

            <button
              type="submit"
              disabled={
                busy ||
                !input.trim()
              }
              className="rounded-full px-6 py-3 font-body font-semibold text-white disabled:opacity-40"
              style={{
                backgroundColor:
                  meta.color,
              }}
            >
              Send
            </button>

          </div>

          {meta.hasSkip && (
            <div className="max-w-2xl mx-auto mt-3 text-center">

              <button
                type="button"
                onClick={() =>
                  sendTurn(
                    "Skip this one, give me a new one please."
                  )
                }
                disabled={busy}
                className="text-sm font-semibold text-ink/60 hover:text-ink bg-paper px-4 py-2 rounded-full disabled:opacity-40"
              >
                Skip / Next Puzzle →
              </button>

            </div>
          )}

        </form>

      </div>

    </div>
  );
}

function Bubble({
  message,
  color,
}) {
  const isUser =
    message.role === "user";

  return (
    <div
      className={`flex ${
        isUser
          ? "justify-end"
          : "justify-start"
      }`}
    >

      <div
        className={`max-w-[80%] rounded-2xl px-6 py-3 font-body text-[15px] leading-relaxed ${
          isUser
            ? "text-white"
            : "bg-white text-ink shadow-sm border border-ink/5"
        }`}
        style={
          isUser
            ? {
                backgroundColor:
                  color,
              }
            : {}
        }
      >

        {message.text ||
          "\u00A0"}

        {message.meta?.fact && (
          <p className="mt-2 text-xs italic opacity-70">
            💡{" "}
            {message.meta.fact}
          </p>
        )}

      </div>

    </div>
  );
}

function TypingDots({
  color,
}) {
  return (
    <div className="flex gap-1.5 px-5">

      {[0, 1, 2].map(
        (i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full animate-bounce"
            style={{
              backgroundColor:
                color,
              animationDelay:
                `${i * 0.15}s`,
            }}
          />
        )
      )}

    </div>
  );
}