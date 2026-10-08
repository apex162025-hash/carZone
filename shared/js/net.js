function queryOn(name) {
  if (typeof location === "undefined") return false;
  return new URLSearchParams(location.search).get(name) === "1";
}

export function isFast() {
  return queryOn("fast") || localStorage.getItem("carzen_fast") === "1";
}
export function isFlaky() {
  return queryOn("flaky") || localStorage.getItem("carzen_flaky") === "1";
}
export function isOffline() {
  return queryOn("offline") || localStorage.getItem("carzen_offline") === "1";
}
export function isPresent() {
  return queryOn("present");
}
export function isLiveClock() {
  return queryOn("live");
}

export function setFlag(name, on) {
  localStorage.setItem(`carzen_${name}`, on ? "1" : "0");
  window.dispatchEvent(new CustomEvent("carzen-net"));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export class NetError extends Error {
  constructor(code, message) {
    super(message || code);
    this.code = code;
  }
}

export async function read(fn) {
  if (isOffline()) return fn();
  return latency(fn);
}

export async function write(fn) {
  if (isOffline()) throw new NetError("offline", "offline");
  return latency(fn);
}

async function latency(fn) {
  const delay = isFast() ? 0 : 300 + Math.floor(Math.random() * 400);
  await sleep(delay);
  if (isFlaky() && Math.random() < 0.2) throw new NetError("network", "network");
  return fn();
}
