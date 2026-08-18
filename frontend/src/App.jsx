import React, {
  useState,
} from "react";

import Home from "./pages/Home.jsx";
import ActivityChat from "./pages/ActivityChat.jsx";

const MAX_GLOBAL_HISTORY = 6;

export default function App() {

  const [
    activityKey,
    setActivityKey,
  ] = useState(null);


  /*
  ================================================
  GLOBAL HISTORY

  6 TOTAL exchanges.

  NOT:
  6 Brain Buster
  + 6 Quick Fire
  + 6 Ask & Explore

  Instead:

  1 Brain Buster
  2 Ask & Explore
  3 Quick Fire
  4 Brain Buster
  5 Quick Fire
  6 Ask & Explore
  ================================================
  */

  const [
    globalHistory,
    setGlobalHistory,
  ] = useState([]);


  /*
  ================================================
  ADD HISTORY
  ================================================
  */

  function addGlobalHistory(
    entry
  ) {

    const newEntry = {
      id: crypto.randomUUID(),

      ...entry,

      timestamp:
        new Date(),
    };


    setGlobalHistory(
      (previous) => {

        const updated = [
          ...previous,
          newEntry,
        ];

        /*
        Keep ONLY newest 6.
        */

        return updated.slice(
          -MAX_GLOBAL_HISTORY
        );
      }
    );
  }


  /*
  ================================================
  CLEAR HISTORY
  ================================================
  */

  function clearHistory() {
    setGlobalHistory([]);
  }


  /*
  ================================================
  OPEN ACTIVITY
  ================================================
  */

  function openActivity(
    activity
  ) {
    setActivityKey(activity);
  }


  /*
  ================================================
  BACK HOME
  ================================================
  */

  function handleBack() {
  setActivityKey(null);
  setGlobalHistory([]);
}


  /*
  ================================================
  HOME
  ================================================
  */

  if (!activityKey) {

    return (
      <Home
        onSelect={openActivity}
        history={globalHistory}
        onClearHistory={
           clearHistory
        }
        onHistoryClick={
            openActivity
        }
      />
    );
  }


  /*
  ================================================
  ACTIVITY CHAT
  ================================================
  
  VERY IMPORTANT:
  
  key={activityKey}
  
  This forces React to create a fresh
  ActivityChat when switching activities,
  which means a new session ID.
  ================================================
  */

  return (
    <ActivityChat
      key={activityKey}

      activityKey={
        activityKey
      }

      onBack={
        handleBack
      }

      onSelect={
        openActivity
      }

      globalHistory={
        globalHistory
      }

      addGlobalHistory={
        addGlobalHistory
      }
    />
  );
}