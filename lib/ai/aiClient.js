// =====================================================================
//  aiClient.js — main-thread façade over the AI worker.
//  Turns the postMessage protocol into awaitable promises and surfaces
//  model-loading status/progress for the UI.
// =====================================================================

export class AIClient {
  constructor({ onStatus, onProgress } = {}) {
    this.worker = new Worker(new URL("./worker.js", import.meta.url), {
      type: "module",
    });
    this.pending = new Map();
    this.seq = 0;
    this.onStatus = onStatus || (() => {});
    this.onProgress = onProgress || (() => {});

    this.worker.onmessage = (e) => {
      const { id, type } = e.data;
      if (type === "status") return this.onStatus(e.data);
      if (type === "progress") return this.onProgress(e.data.data);
      const job = this.pending.get(id);
      if (!job) return;
      this.pending.delete(id);
      if (type === "error") job.reject(new Error(e.data.error));
      else job.resolve(e.data.result);
    };
    this.worker.onerror = (e) => {
      // Reject everything in flight so the UI never hangs on a dead worker.
      for (const job of this.pending.values()) job.reject(e.error || new Error(e.message));
      this.pending.clear();
    };
  }

  _send(type, payload) {
    const id = ++this.seq;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage({ id, type, payload });
    });
  }

  warmup() {
    return this._send("warmup");
  }
  process(blob) {
    return this._send("process", { blob });
  }
  embedText(text) {
    return this._send("embedText", { text });
  }
  terminate() {
    this.worker.terminate();
  }
}
