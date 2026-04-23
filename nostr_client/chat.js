import { generateSecretKey, getPublicKey, finalizeEvent, getEventHash } from "@nostr/tools/pure";
import { SimplePool } from "@nostr/tools/pool";
import * as nip44 from "@nostr/tools/nip44";
import { hexToBytes, bytesToHex } from "@noble/hashes/utils.js";

const RELAY_URL = "ws://localhost:7000";
const RECIPIENT_PUBKEY = "1221423ae8cd8b7cebc94b9377df93336f3a17c3fcd95876042517d553b953de";
const STORAGE_KEY = "cosats.ownerKeys.v1";
const CONVERSATION_HISTORY = "cosats.ownerConversation.v1";
const LIST_OF_EVENT_ID = "cosats.listofEventID.v1";

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

let ownerKeys = loadOrCreateOwnerKeys();
let ownerSk = hexToBytes(ownerKeys.skHex);
const ownerPk = ownerKeys.pkHex;

const nowSec = () => Math.floor(Date.now() / 1000);
// Randomise timestamps per NIP-59 to thwart time-analysis
const randomPast = () => Math.floor(Date.now() / 1000 - (Math.random() * 3 + 2) * 86400);

const statusEl = document.getElementById("status");
const chatEl = document.getElementById("chat");
const inputEl = document.getElementById("input");
const sendBtn = document.getElementById("sendBtn");
const form = document.getElementById("composer");

const trunc = pk => `${pk.slice(0, 8)}…${pk.slice(-8)}`;
document.getElementById("ownerPubkey").textContent = trunc(ownerPk);
document.getElementById("recipientPubkey").textContent = trunc(RECIPIENT_PUBKEY);

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function setStatus(cls, text) {
  statusEl.className = `status ${cls}`;
  statusEl.textContent = text;
}

function addMessage(who, body, ts) {
  const div = document.createElement("div");
  div.className = `msg ${who === "me" ? "me" : "ai"}`;
  const when = new Date((ts ?? nowSec()) * 1000).toLocaleTimeString();
  div.innerHTML = `<div class="msg-meta">${who === "me" ? "You" : "AI"} · ${when}</div><div class="msg-body">${escapeHtml(body)}</div>`;
  chatEl.appendChild(div);
  chatEl.scrollTop = chatEl.scrollHeight;
}

// NIP-59 helpers --------------------------------------------------------

function convKey(sk, pk) {
  return nip44.v2.utils.getConversationKey(sk, pk);
}

function enc(data, sk, pk) {
  return nip44.v2.encrypt(JSON.stringify(data), convKey(sk, pk));
}

function dec(ciphertext, sk, pk) {
  return JSON.parse(nip44.v2.decrypt(ciphertext, convKey(sk, pk)));
}

/** Unsigned kind-14 DM rumor */
function buildRumor(content) {
  const kindDm = {
    kind: 14,
    content,
    tags: [["p", RECIPIENT_PUBKEY]],
  };

  const r = {
    created_at: Math.floor(Date.now() / 1000),
    content: "",
    tags: [],
    ...kindDm,
    pubkey: ownerPk,
}
  r.id = getEventHash(r); // id but no sig — that's what makes it a rumor
  return r;
}

/** kind-13 seal: encrypts the rumor, signed by the real sender */
function buildSeal(rumor) {
  return finalizeEvent({
    kind: 13,
    content: enc(rumor, ownerSk, RECIPIENT_PUBKEY),
    created_at: randomPast(),
    tags: [],
  }, ownerSk);
}

/** kind-1059 gift wrap: encrypts the seal with a one-time ephemeral key */
function buildGiftWrap(seal) {
  const ephSk = generateSecretKey();
  return finalizeEvent({
    kind: 1059,
    content: enc(seal, ephSk, RECIPIENT_PUBKEY),
    created_at: randomPast(),
    tags: [["p", RECIPIENT_PUBKEY]],
  }, ephSk);
}
// Get Onwer's Conversation ------------------------------------------------------

function getConversationHistory()
{
  return JSON.parse(localStorage.getItem(CONVERSATION_HISTORY)) ?? [];

}

// Get Onwer's Conversation ------------------------------------------------------

function saveMessageInConversationHistory(text,timestamp,by)
{
  const newConversation = {
    "role":by,
    "timestamp": timestamp,
    "content":text
  };
  let conversationHistory = JSON.parse(localStorage.getItem(CONVERSATION_HISTORY)) ?? [];
  conversationHistory.push(newConversation)
  localStorage.setItem(CONVERSATION_HISTORY,JSON.stringify(conversationHistory));

}

// Rumor event ID list
function CheckEventIDList(event)
{
  let eventlist = JSON.parse(localStorage.getItem(LIST_OF_EVENT_ID));

  return (eventlist != null && eventlist.includes(event.id)) ? true: updateEventIDList(event);

}

function updateEventIDList(event)
{
  let eventlist = JSON.parse(localStorage.getItem(LIST_OF_EVENT_ID)) ?? [];
  eventlist.push(event.id);
  localStorage.setItem(LIST_OF_EVENT_ID,JSON.stringify(eventlist));
  saveMessageInConversationHistory(event.content,event.created_at,"ai");
  addMessage("ai",event.content,event.created_at);

}

// Relay -------------------------------------------------------------------

const pool = new SimplePool();

function connect() {
  setStatus("warn", "connecting…");
  let conversationHistory = getConversationHistory();

  conversationHistory.forEach(conversation => {
    addMessage(conversation.by, conversation.content, conversation.timestamp)
    
  });
  let fetchedEvents = [];

  pool.subscribe(
    [RELAY_URL],
    { kinds: [1059] },
    {
      onevent(wrap) {
        try {

          // Unwrap: gift wrap → seal → rumor
          const seal = dec(wrap.content, ownerSk, wrap.pubkey);
          if (seal.kind !== 13) return;
          let rumor = dec(seal.content, ownerSk, seal.pubkey);

          if (rumor.kind !== 14) return;
          fetchedEvents.push(rumor);
          
        } catch { /* ignore undecryptable events */ }
      },
      oneose() { 
        fetchedEvents.forEach(rumor => {
          CheckEventIDList(rumor);
        })
       console.log(fetchedEvents);
       fetchedEvents = [];
        setStatus("ok", "connected"); 
      },
      onerror() { setStatus("bad", "relay error"); },
    }
  );
}

async function sendDm(text) {
  const rumor = `buildRumor`(text);
  const seal = buildSeal(rumor);
  const wrap = buildGiftWrap(seal);

  console.log("[NIP-59] rumor (unsigned kind-14):", rumor);
  console.log("[NIP-59] seal  (signed kind-13):", seal);
  console.log("[NIP-59] wrap  (kind-1059 emitted to relay):", wrap);

  const [result] = await Promise.allSettled(pool.publish([RELAY_URL], wrap));
  if (result.status === "rejected") throw result.reason;
  let msgTimestamp = nowSec();
  saveMessageInConversationHistory(text, msgTimestamp,"me");
  addMessage("me", text, msgTimestamp);
}

// UI events ---------------------------------------------------------------

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = inputEl.value.trim();
  if (!text) return;
  sendBtn.disabled = true;
  try {
    await sendDm(text);
    inputEl.value = "";
  } catch (err) {
    addMessage("me", `Send failed: ${err?.message ?? err}`, nowSec());
  } finally {
    sendBtn.disabled = false;
  }
});

inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    form.requestSubmit();
  }
});

document.getElementById("resetKeysBtn").addEventListener("click", () => {
  resetOwnerKeys();
  location.reload();
});

connect();
