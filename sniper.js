import http2 from "http2"; // @woet.mjs
import WebSocket from "ws";
import fs from "fs";
import extractJsonFromString from "extract-json-from-string";
const client = http2.connect('https://canary.discord.com');
let vanity;
let mfaToken = "";
const guilds = {};
const token = "askyokolmakdiyorbiri"; // selftokens
const chamberofreflection = 1;
const log = (data) => {
  console.log("response:", data.toString());
  const ext = extractJsonFromString(data.toString());
  const find = ext.find((e) => e.code || e.message);
  if (find) {
    const body = JSON.stringify({
      content: `@everyone ${vanity}\n\`\`\`json\n${JSON.stringify(find)}\`\`\``
    });
    const req = client.request({
      ':method': 'POST',
      ':path': '/api/channels/channel/messages', // log channel
      'authorization': token,
      'content-type': 'application/json',
    });
    req.write(body);
    req.end();
  }
};
client.on('connect', async () => {
  connectWebSocket();
  sendHeadRequests();
});
client.on('error', () => {
  process.exit();
});
client.on('close', () => {
  process.exit();
});
const connectWebSocket = () => {
  const ws = new WebSocket("wss://gateway.discord.gg/");
  ws.onclose = () => process.exit();
  ws.onmessage = (message) => {
    const { d, op, t } = JSON.parse(message.data);
    switch (t) {
      case "GUILD_UPDATE": {
        const find = guilds[d.guild_id];
        if (find && find !== d.vanity_url_code) {
          vanity = find;
          const requestBody = JSON.stringify({ code: find });
          const req = client.request({
            ':method': 'PATCH',
            ':path': '/api/v9/guilds/guild/vanity-url', // claim guild id
            'authorization': token,
            'x-discord-mfa-authorization': mfaToken,
            'user-agent': 'Chrome/124',
            'x-super-properties': 'eyJicm93c2VyIjoiQ2hyb21lIiwiYnJvd3Nlcl91c2VyX2FnZW50IjoiQ2hyb21lIiwiY2xpZW50X2J1aWxkX251bWJlciI6MzU1NjI0fQ==', 
            'content-type': 'application/json',
          }, { priority: { weight: 255, exclusive: true } });
          let responseData = '';
          req.on("data", chunk => responseData += chunk);
          req.on("end", () => {
            log(responseData);
            vanity = find;
          });
          req.end(requestBody);
        }
        break;
      }
      case "READY": {
        d.guilds.forEach(({ id, vanity_url_code }) => {
          if (vanity_url_code) guilds[id] = vanity_url_code;
        });
        break;
      }
    }
    if (op === 7) return process.exit();
    if (op === 10) {
      ws.send(JSON.stringify({
        op: 2,
        d: {
          token: token,
          intents: 1 << 0,
          properties: {
            os: "linux",
            browser: "firefox",
            device: "woet",
          },
        },
      }));
      setTimeout(() => {
        setInterval(() => ws.send(JSON.stringify({ op: 1, d: {}, s: null, t: "heartbeat" })), d.heartbeat_interval);
      }, d.heartbeat_interval * Math.random());
    }
  };
};
function sendHeadRequests() {
  for (let i = 0; i < chamberofreflection; i++) {
    if (client.destroyed) break;
    const req = client.request({
      ':method': 'HEAD',
      ':path': '/api/users/@me',
      'authorization': token,
    });
    req.on('response', (headers) => {
      const status = headers[':status'];
      if (status !== 200) {   
        log(Buffer.from(JSON.stringify({ status, message: 'HEAD response' })));
      }
    });
    req.on('error', (err) => {
      log(Buffer.from(JSON.stringify({ error: err.message })));
    });

    req.end();
  }
}
fs.readFile("mfa.txt", "utf8", (err, data) => {
  if (!err) mfaToken = data.trim();
});
fs.watch("mfa.txt", (eventType) => {
  if (eventType === "change") {
    fs.readFile("mfa.txt", "utf8", (err, data) => {
      if (!err) mfaToken = data.trim();
    });
  }
});

// @woet.mjs
// en una tierra muy alejada de todo y de todos :)
