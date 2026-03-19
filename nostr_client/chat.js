import { generateSecretKey, getPublicKey, finalizeEvent, getEventHash } from "@nostr/tools/pure";
import { SimplePool } from "@nostr/tools/pool";
import * as nip44 from "@nostr/tools/nip44";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";

const RELAY_URL = "ws://localhost:7000";
const AI_PUBKEY = "1221423ae8cd8b7cebc94b9377df93336f3a17c3fcd95876042517d553b953de";
const STORAGE_KEY = "cosats.ownerKeys.v1";

const nowSec = () => Math.floor(Date.now() / 1000);
const randomNow = () =>
  Math.floor(
    Date.now() / 1000 -
      (Math.floor(Math.random() * (5 - 2 + 1)) + 2) * 24 * 60 * 60
  );

const el = {
  relayUrl: document.getElementById("relayUrl"),
  ownerPubkey: document.getElementById("ownerPubkey"),
  aiPubkey: document.getElementById("aiPubkey"),
  status: document.getElementById("status"),
  chat: document.getElementById("chat"),
  composer: document.getElementById("composer"),
  input: document.getElementById("input"),
  sendBtn: document.getElementById("sendBtn"),
  reconnectBtn: document.getElementById("reconnectBtn"),
  resetKeysBtn: document.getElementById("resetKeysBtn"),
};

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setStatus(kind, text) {
  el.status.className = `pill ${kind}`;
  el.status.textContent = text;
}

function appendMessage({ who, body, ts }) {
  const wrap = document.createElement("div");
  wrap.className = `msg ${who === "me" ? "me" : "ai"}`;
  const when = new Date((ts ?? nowSec()) * 1000).toLocaleString();
  wrap.innerHTML = `
    <div class="h">
      <div class="who">${who === "me" ? "Owner" : "AI"}</div>
      <div class="when">${when}</div>
    </div>
    <div class="body">${escapeHtml(body)}</div>
  `;
  el.chat.appendChild(wrap);
  el.chat.scrollTop = el.chat.scrollHeight;
}

function loadOrCreateOwnerKeys() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    const parsed = JSON.parse(raw);
    if (parsed?.skHex && parsed?.pkHex) return parsed;
  }
  const sk = generateSecretKey();
  const pkHex = getPublicKey(sk);
  const keys = { skHex: bytesToHex(sk), pkHex };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
  return keys;
}

function resetOwnerKeys() {
  localStorage.removeItem(STORAGE_KEY);
  return loadOrCreateOwnerKeys();
}

function nip44ConversationKey(privateKeyBytes, recipientPublicKeyHex) {
  return nip44.v2.utils.getConversationKey(privateKeyBytes, recipientPublicKeyHex);
}

function nip44EncryptJson(data, privateKeyBytes, recipientPublicKeyHex) {
  return nip44.v2.encrypt(
    JSON.stringify(data),
    nip44ConversationKey(privateKeyBytes, recipientPublicKeyHex)
  );
}

function nip44DecryptJson(eventWithContent, privateKeyBytes, senderPublicKeyHex) {
  return JSON.parse(
    nip44.v2.decrypt(
      eventWithContent.content,
      nip44ConversationKey(privateKeyBytes, senderPublicKeyHex)
    )
  );
}

function createRumor(event, privateKeyBytes) {
  const rumor = {
    created_at: nowSec(),
    content: "",
    tags: [],
    ...event,
    pubkey: getPublicKey(privateKeyBytes),
  };

  rumor.id = getEventHash(rumor);
  return rumor;
}

function createSeal(rumor, privateKeyBytes, recipientPublicKeyHex) {
  return finalizeEvent(
    {
      kind: 13,
      content: nip44EncryptJson(rumor, privateKeyBytes, recipientPublicKeyHex),
      created_at: randomNow(),
      tags: [],
    },
    privateKeyBytes
  );
}

function createWrap(event, recipientPublicKeyHex) {
  const randomKey = generateSecretKey();
  return finalizeEvent(
    {
      kind: 1059,
      content: nip44EncryptJson(event, randomKey, recipientPublicKeyHex),
      created_at: randomNow(),
      tags: [["p", recipientPublicKeyHex]],
    },
    randomKey
  );
}

let ownerKeys = loadOrCreateOwnerKeys();
let ownerSkBytes = hexToBytes(ownerKeys.skHex);

el.relayUrl.textContent = RELAY_URL;
el.ownerPubkey.textContent = ownerKeys.pkHex;
el.aiPubkey.textContent = AI_PUBKEY;

let pool = null;
let sub = null;

function disconnect() {
  try {
    sub?.close?.();
  } catch {}
  sub = null;

  try {
    pool?.close?.([RELAY_URL]);
  } catch {}
  pool = null;
}

function connect() {
  disconnect();
  setStatus("warn", "connecting…");

  pool = new SimplePool();

  sub = pool.subscribe(
    [RELAY_URL],
    {
      kinds: [1059],
      "#p": [ownerKeys.pkHex],
      limit: 50,
    },
    {
      onevent: (giftWrap) => {
        if (!giftWrap || giftWrap.kind !== 1059) return;

        let seal;
        try {
          seal = nip44DecryptJson(giftWrap, ownerSkBytes, giftWrap.pubkey);
        } catch {
          return;
        }
        if (!seal?.content || seal?.kind !== 13 || !seal?.pubkey) return;

        let rumor;
        try {
          rumor = nip44DecryptJson(seal, ownerSkBytes, seal.pubkey);
        } catch {
          return;
        }
        if (rumor?.kind !== 14) return;

        const content =
          typeof rumor.content === "string" ? rumor.content : JSON.stringify(rumor.content);
        appendMessage({ who: "ai", body: `private dm: ${content}`, ts: rumor.created_at });
      },
      onerror: () => {
        setStatus("bad", "error");
      },
      oneose: () => {
        setStatus("ok", "connected");
      },
    }
  );
}

async function sendDm(text) {
  const kind14Event = {
    kind: 14,
    tags: [
      ["p", AI_PUBKEY, RELAY_URL],
      ["subject", "private dm"],
    ],
    content: text,
  };

  const rumor = createRumor(kind14Event, ownerSkBytes);
  const seal = createSeal(rumor, ownerSkBytes, AI_PUBKEY);
  const giftWrap = createWrap(seal, AI_PUBKEY);

  const ok = await Promise.any(pool.publish([RELAY_URL], giftWrap));
  if (!ok) throw new Error("Failed to publish event");

  appendMessage({ who: "me", body: `private dm: ${text}`, ts: nowSec() });
}

el.composer.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = el.input.value.trim();
  if (!text) return;
  if (!pool) {
    appendMessage({ who: "me", body: "Not connected to relay.", ts: nowSec() });
    return;
  }

  el.sendBtn.disabled = true;
  try {
    await sendDm(text);
    el.input.value = "";
  } catch (err) {
    appendMessage({ who: "me", body: `Send failed: ${err?.message ?? err}`, ts: nowSec() });
  } finally {
    el.sendBtn.disabled = false;
  }
});

el.input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    el.composer.requestSubmit();
  }
});

el.reconnectBtn.addEventListener("click", () => {
  connect();
});

el.resetKeysBtn.addEventListener("click", () => {
  ownerKeys = resetOwnerKeys();
  ownerSkBytes = hexToBytes(ownerKeys.skHex);
  el.ownerPubkey.textContent = ownerKeys.pkHex;
  appendMessage({ who: "me", body: `Generated new owner keys.`, ts: nowSec() });
  connect();
});

connect();

