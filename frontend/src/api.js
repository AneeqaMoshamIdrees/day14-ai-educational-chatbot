const API_BASE =
  import.meta.env.VITE_API_BASE || "http://localhost:8000";

/*
==================================================
STREAMING CHAT
Works for ALL activities:
- Brain Buster
- Quick Fire
- Ask & Explore
==================================================
*/

export async function sendStreamingMessage(
  sessionId,
  activity,
  message,
  onToken,
  onDone
) {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      session_id: sessionId,
      activity,
      message,
    }),
  });

  if (!res.ok || !res.body) {
    throw new Error(`Request failed: ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, {
      stream: true,
    });

    const events = buffer.split("\n\n");

    buffer = events.pop() || "";

    for (const event of events) {
      const line = event.trim();

      if (!line.startsWith("data:")) {
        continue;
      }

      const payload = line.slice(5).trim();

      if (payload === "[DONE]") {
        onDone();
        return;
      }

      try {
        const data = JSON.parse(payload);

        if (data.token) {
          onToken(data.token);
        }
      } catch (error) {
        console.error(
          "SSE JSON parsing error:",
          payload,
          error
        );
      }
    }
  }

  onDone();
}


/*
==================================================
END SESSION
==================================================
*/

export async function endSession(sessionId) {
  try {
    await fetch(
      `${API_BASE}/api/session/${sessionId}`,
      {
        method: "DELETE",
      }
    );
  } catch (error) {
    console.error(
      "Error ending session:",
      error
    );
  }
}