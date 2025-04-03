import process from "node:process";

import { twitch } from "./private_config.ts";
import { reset, rotate } from "./main.ts";
const OAUTH_TOKEN = twitch.access_token; // Needs channel:read:redemptions, user:read:chat, 
const CLIENT_ID = twitch.client_id;

let CHAT_CHANNEL_USER_ID: string = twitch.channel_id; // This is the User ID of the channel that the bot will join and listen to chat messages of

const EVENTSUB_WEBSOCKET_URL = "wss://eventsub.wss.twitch.tv/ws";

let websocketSessionID: string;

// Start executing the bot from here
(async () => {
  // Verify that the authentication is valid
  await getAuth();

  // Start WebSocket client and register handlers
  const _websocketClient = startWebSocketClient();
})();

// WebSocket will persist the application loop until you exit the program forcefully

async function getAuth() {
  // https://dev.twitch.tv/docs/authentication/validate-tokens/#how-to-validate-a-token
  const response = await fetch("https://id.twitch.tv/oauth2/validate", {
    method: "GET",
    headers: {
      "Authorization": "OAuth " + OAUTH_TOKEN,
    },
  });

  if (response.status != 200) {
    const data = await response.json();
    console.error(
      "Token is not valid. /oauth2/validate returned status code " +
        response.status,
    );
    console.error(data);
    process.exit(1);
  }

  const user_response = await fetch(
    "https://api.twitch.tv/helix/users?login=" + twitch.channel_name,
    {
      method: "GET",
      headers: {
        Authorization: "Bearer " + OAUTH_TOKEN,
        "Client-Id": CLIENT_ID,
      },
    },
  ).then((r) => r.json());

  CHAT_CHANNEL_USER_ID = user_response.data[0].id;
  console.log("CHAT CHANNEL USER ID: " + CHAT_CHANNEL_USER_ID);

  console.log("Validated token.");
}

function startWebSocketClient() {
  const websocketClient = new WebSocket(EVENTSUB_WEBSOCKET_URL);

  websocketClient.onerror = console.error;

  websocketClient.onopen = () => {
    console.log("WebSocket connection opened to " + EVENTSUB_WEBSOCKET_URL);
  };

  websocketClient.onmessage = (data) => {
    handleWebSocketMessage(data);
  };

  return websocketClient;
}

// deno-lint-ignore no-explicit-any
async function handleWebSocketMessage({ data: str }: MessageEvent<any>) {
  const data = JSON.parse(str);
  switch (data.metadata.message_type) {
    case "session_welcome": // First message you get from the WebSocket server when connecting
      websocketSessionID = data.payload.session.id; // Register the Session ID it gives us

      // Listen to EventSub, which joins the chatroom from your bot's account
      registerEventSubListeners();
      break;
    case "notification": // An EventSub notification has occurred, such as channel.chat.message
      switch (data.metadata.subscription_type) {
        case "channel.chat.message":
          if (
            data.payload.event.chatter_user_id == CHAT_CHANNEL_USER_ID &&
            data.payload.event.message.text.includes("!reset")
          ) {
            await reset();
          }
          break;
        case "channel.channel_points_custom_reward_redemption.add":
          console.log(data.payload);
          if (data.payload.event.reward.id == twitch.clockwise_event) {
            await rotateClockwise();
          } else if (
            data.payload.event.reward.id == twitch.counterclockwise_event
          ) {
            await rotateCounterClockwise();
          }
          break;
      }
      break;
  }
}

async function registerEventSubListeners() {
  {
    // Register channel.channel_points_custom_reward_redemption.add
    const response = await fetch(
      "https://api.twitch.tv/helix/eventsub/subscriptions",
      {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + OAUTH_TOKEN,
          "Client-Id": CLIENT_ID,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "channel.channel_points_custom_reward_redemption.add",
          version: "1",
          condition: {
            broadcaster_user_id: CHAT_CHANNEL_USER_ID,
          },
          transport: {
            method: "websocket",
            session_id: websocketSessionID,
          },
        }),
      },
    );

    if (response.status != 202) {
      const data = await response.json();
      console.error(
        "Failed to subscribe to channel.channel_points_custom_reward_redemption.add. API call returned status code " +
          response.status,
      );
      console.error(data);
      process.exit(1);
    } else {
      const data = await response.json();
      console.log(
        `Subscribed to channel.channel_points_custom_reward_redemption.add [${
          data.data[0].id
        }]`,
      );
    }
  }

  {
    // Register channel.chat.message
    const response = await fetch(
      "https://api.twitch.tv/helix/eventsub/subscriptions",
      {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + OAUTH_TOKEN,
          "Client-Id": CLIENT_ID,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "channel.chat.message",
          version: "1",
          condition: {
            broadcaster_user_id: CHAT_CHANNEL_USER_ID,
            user_id: CHAT_CHANNEL_USER_ID,
          },
          transport: {
            method: "websocket",
            session_id: websocketSessionID,
          },
        }),
      },
    );

    if (response.status != 202) {
      const data = await response.json();
      console.error(
        "Failed to subscribe to channel.chat.message. API call returned status code " +
          response.status,
      );
      console.error(data);
      process.exit(1);
    } else {
      const data = await response.json();
      console.log(`Subscribed to channel.chat.message [${data.data[0].id}]`);
    }
  }
}

async function rotateClockwise() {
  await rotate(1);
}

async function rotateCounterClockwise() {
  await rotate(-1);
}
