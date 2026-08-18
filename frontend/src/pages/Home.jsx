import React from "react";
import { ACTIVITIES } from "../activities.js";

const ROTATIONS = {
  brain_buster: "-rotate-2",
  quick_fire: "rotate-1",
  ask_explore: "-rotate-1",
};

export default function Home({
  onSelect,
  history,
  onHistoryClick,
  onClearHistory,
}) {
  return (
    <div className="min-h-screen px-6 py-12">

      {/* =========================================
          HEADER
          ========================================= */}

      <div className="text-center mb-12">

        <h1 className="font-display text-5xl font-extrabold text-ink squiggle-underline mb-3">
          Learning Playground
        </h1>

        <p className="font-body text-ink/60 mt-6 text-lg">
          Pick something to play with.
        </p>

      </div>


      {/* =========================================
          ACTIVITIES
          ========================================= */}

      <div className="grid gap-8 sm:grid-cols-3 max-w-4xl w-full mx-auto">

        {Object.values(ACTIVITIES).map((activity) => (
          <button
            key={activity.key}
            onClick={() =>
              onSelect(activity.key)
            }
            className={`group relative bg-white rounded-[2rem] p-7 text-left shadow-[0_6px_0_rgba(27,42,65,0.08)]
                        border-2 border-ink/5 transition-transform duration-200
                        hover:-translate-y-1 ${ROTATIONS[activity.key]} hover:rotate-0`}
          >

            <span
              className="inline-flex items-center justify-center w-14 h-14 rounded-2xl text-3xl mb-5"
              style={{
                backgroundColor:
                  `${activity.color}22`,
              }}
            >
              {activity.emoji}
            </span>

            <h2 className="font-display text-2xl font-bold text-ink mb-1">
              {activity.title}
            </h2>

            <p className="font-body text-ink/60 text-sm">
              {activity.tagline}
            </p>

            <span
              className="absolute top-5 right-5 w-3 h-3 rounded-full"
              style={{
                backgroundColor:
                  activity.color,
              }}
            />

          </button>
        ))}

      </div>


      {/* =========================================
          JOURNEY HISTORY
          ========================================= */}

      <section className="max-w-4xl mx-auto mt-16">

        <div className="flex items-center justify-between mb-5">

          <div>
            <h2 className="font-display text-2xl font-bold text-ink">
              🕐 Journey History
            </h2>

            <p className="text-sm text-ink/40 mt-1">
              Your 6 most recent conversations
            </p>
          </div>


          {history.length > 0 && (
            <button
              onClick={onClearHistory}
              className="text-sm text-ink/50 hover:text-ink"
            >
              Clear history
            </button>
          )}

        </div>


        {history.length === 0 ? (
          <div className="bg-white rounded-2xl border border-ink/5 p-8 text-center">

            <p className="text-ink/40">
              No conversations yet.
            </p>

            <p className="text-sm text-ink/30 mt-1">
              Start an activity above!
            </p>

          </div>
        ) : (

          <div className="grid gap-3">

            {history
              .slice()
              .reverse()
              .map((entry) => {

                const activity =
                  ACTIVITIES[entry.activity];

                return (
                  <button
                    key={entry.id}
                    onClick={() =>
                      onHistoryClick(
                        entry.activity
                      )
                    }
                    className="w-full text-left bg-white rounded-2xl border border-ink/5 p-4
                               hover:-translate-y-0.5 hover:shadow-md
                               transition-all"
                  >

                    <div className="flex items-start gap-4">

                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
                        style={{
                          backgroundColor:
                            `${activity.color}22`,
                        }}
                      >
                        {activity.emoji}
                      </div>


                      <div className="flex-1 min-w-0">

                        <div className="flex justify-between items-center gap-3">

                          <h3
                            className="font-semibold"
                            style={{
                              color:
                                activity.color,
                            }}
                          >
                            {activity.title}
                          </h3>

                          <span className="text-xs text-ink/30">
                            {new Date(
                              entry.timestamp
                            ).toLocaleTimeString([], {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </span>

                        </div>


                        <p className="text-sm font-semibold text-ink/70 mt-1">
                          {entry.userText}
                        </p>


                        <p className="text-sm text-ink/45 mt-1 line-clamp-2">
                          {entry.assistantText}
                        </p>

                      </div>

                    </div>

                  </button>
                );
              })}

          </div>

        )}

      </section>

    </div>
  );
}