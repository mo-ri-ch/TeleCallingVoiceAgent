/**
 * Bridgeon AI Telecaller Agent — embeddable widget loader.
 *
 * Drop this on any site with:
 *   <script src="https://your-domain.com/loader.js" data-company-id="bridgeon-skillversity"></script>
 *
 * It defines a <bridgeon-agent-widget> custom element rendered in a Shadow
 * DOM (so its styles never leak into, or get overridden by, the host page),
 * shows a floating launcher button, and opens into a text + voice chat panel
 * backed by the AI Telecaller Voice Agent API.
 */
(function () {
  "use strict";

  var TAG_NAME = "bridgeon-agent-widget";
  var DEFAULT_API_BASE = "http://localhost:8000/api/v1";
  var TARGET_SAMPLE_RATE = 16000;

  if (customElements.get(TAG_NAME)) {
    return; // Already loaded on this page.
  }

  // ---------------------------------------------------------------------
  // PCM16 WAV recording (mirrors frontend/src/lib/pcm-recorder.ts so the
  // widget's voice turns are compatible with the Sarvam STT pipeline).
  // ---------------------------------------------------------------------

  function resample(input, inputSampleRate, outputSampleRate) {
    if (inputSampleRate === outputSampleRate) return input;

    var ratio = inputSampleRate / outputSampleRate;
    var outputLength = Math.round(input.length / ratio);
    var output = new Float32Array(outputLength);

    for (var i = 0; i < outputLength; i++) {
      var position = i * ratio;
      var index = Math.floor(position);
      var fraction = position - index;
      var sampleA = input[index] || 0;
      var sampleB = index + 1 < input.length ? input[index + 1] : sampleA;
      output[i] = sampleA + (sampleB - sampleA) * fraction;
    }

    return output;
  }

  function encodeWavPCM16(samples, sampleRate) {
    var buffer = new ArrayBuffer(44 + samples.length * 2);
    var view = new DataView(buffer);

    function writeString(offset, value) {
      for (var i = 0; i < value.length; i++) {
        view.setUint8(offset + i, value.charCodeAt(i));
      }
    }

    writeString(0, "RIFF");
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, "data");
    view.setUint32(40, samples.length * 2, true);

    var offset = 44;
    for (var i = 0; i < samples.length; i++) {
      var clamped = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
      offset += 2;
    }

    return new Blob([buffer], { type: "audio/wav" });
  }

  function PcmRecorder() {
    this.stream = null;
    this.audioContext = null;
    this.sourceNode = null;
    this.processorNode = null;
    this.chunks = [];
  }

  PcmRecorder.prototype.start = function () {
    return navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      var AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      this.stream = stream;
      this.audioContext = new AudioContextCtor();
      this.sourceNode = this.audioContext.createMediaStreamSource(stream);
      this.processorNode = this.audioContext.createScriptProcessor(4096, 1, 1);
      this.chunks = [];

      this.processorNode.onaudioprocess = (event) => {
        this.chunks.push(new Float32Array(event.inputBuffer.getChannelData(0)));
      };

      this.sourceNode.connect(this.processorNode);
      this.processorNode.connect(this.audioContext.destination);
    });
  };

  PcmRecorder.prototype.stop = function () {
    var sampleRate = (this.audioContext && this.audioContext.sampleRate) || TARGET_SAMPLE_RATE;

    if (this.processorNode) this.processorNode.disconnect();
    if (this.sourceNode) this.sourceNode.disconnect();
    if (this.stream) this.stream.getTracks().forEach(function (track) { track.stop(); });
    if (this.audioContext) this.audioContext.close();

    var totalLength = this.chunks.reduce(function (sum, chunk) { return sum + chunk.length; }, 0);
    var merged = new Float32Array(totalLength);
    var position = 0;
    for (var i = 0; i < this.chunks.length; i++) {
      merged.set(this.chunks[i], position);
      position += this.chunks[i].length;
    }

    var resampled = resample(merged, sampleRate, TARGET_SAMPLE_RATE);

    this.stream = null;
    this.audioContext = null;
    this.sourceNode = null;
    this.processorNode = null;
    this.chunks = [];

    return encodeWavPCM16(resampled, TARGET_SAMPLE_RATE);
  };

  // ---------------------------------------------------------------------
  // Icons
  // ---------------------------------------------------------------------

  var ICON_CHAT =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>' +
    '</svg>';

  var ICON_CLOSE =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>' +
    '</svg>';

  var ICON_SEND =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>' +
    '</svg>';

  var ICON_MIC =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>' +
    '<path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>' +
    '</svg>';

  var ICON_STOP =
    '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>';

  // ---------------------------------------------------------------------
  // Styles (fully scoped inside the Shadow DOM — nothing leaks out, and the
  // host page's CSS cannot reach in).
  // ---------------------------------------------------------------------

  var STYLES =
    ":host { all: initial; }" +
    "* { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }" +
    ".bag-launcher {" +
    "  position: fixed; bottom: 24px; right: 24px; width: 60px; height: 60px; border-radius: 50%;" +
    "  background: linear-gradient(135deg, #4f46e5, #4338ca); color: #fff; border: none;" +
    "  box-shadow: 0 10px 25px rgba(79, 70, 229, 0.4); cursor: pointer;" +
    "  display: flex; align-items: center; justify-content: center; z-index: 2147483000;" +
    "  transition: transform 0.2s ease;" +
    "}" +
    ".bag-launcher:hover { transform: scale(1.06); }" +
    ".bag-launcher svg { width: 26px; height: 26px; }" +
    ".bag-panel {" +
    "  position: fixed; bottom: 96px; right: 24px; width: 360px; max-width: calc(100vw - 32px);" +
    "  height: 520px; max-height: calc(100vh - 140px); background: #ffffff; border-radius: 18px;" +
    "  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.25); display: flex; flex-direction: column;" +
    "  overflow: hidden; z-index: 2147483000; opacity: 0; transform: translateY(16px) scale(0.98);" +
    "  pointer-events: none; transition: opacity 0.18s ease, transform 0.18s ease;" +
    "}" +
    ".bag-panel.bag-open { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }" +
    ".bag-header {" +
    "  background: linear-gradient(135deg, #4f46e5, #4338ca); color: #fff; padding: 16px;" +
    "  display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-shrink: 0;" +
    "}" +
    ".bag-header-info { display: flex; align-items: center; gap: 10px; min-width: 0; }" +
    ".bag-avatar {" +
    "  width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.2);" +
    "  display: flex; align-items: center; justify-content: center; font-weight: 600;" +
    "  font-size: 15px; flex-shrink: 0;" +
    "}" +
    ".bag-title { font-size: 14px; font-weight: 600; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }" +
    ".bag-subtitle { font-size: 12px; opacity: 0.85; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }" +
    ".bag-close {" +
    "  background: transparent; border: none; color: #fff; cursor: pointer; width: 28px; height: 28px;" +
    "  border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;" +
    "}" +
    ".bag-close:hover { background: rgba(255,255,255,0.15); }" +
    ".bag-close svg, .bag-icon-btn svg { width: 18px; height: 18px; }" +
    ".bag-messages { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 10px; background: #f8fafc; }" +
    ".bag-msg { max-width: 85%; padding: 9px 13px; border-radius: 14px; font-size: 13.5px; line-height: 1.45; white-space: pre-wrap; word-break: break-word; }" +
    ".bag-msg-user { align-self: flex-end; background: #4f46e5; color: #fff; border-bottom-right-radius: 4px; }" +
    ".bag-msg-assistant { align-self: flex-start; background: #fff; color: #1e293b; border: 1px solid #e2e8f0; border-bottom-left-radius: 4px; }" +
    ".bag-status { padding: 4px 16px; font-size: 12px; color: #64748b; font-style: italic; min-height: 22px; background: #f8fafc; flex-shrink: 0; }" +
    ".bag-input-row { display: flex; align-items: center; gap: 8px; padding: 10px; border-top: 1px solid #e2e8f0; background: #fff; flex-shrink: 0; }" +
    ".bag-input { flex: 1; border: 1px solid #e2e8f0; border-radius: 20px; padding: 9px 14px; font-size: 13.5px; outline: none; color: #1e293b; min-width: 0; }" +
    ".bag-input:focus { border-color: #4f46e5; }" +
    ".bag-icon-btn { width: 36px; height: 36px; border-radius: 50%; border: none; flex-shrink: 0; display: flex; align-items: center; justify-content: center; cursor: pointer; background: #f1f5f9; color: #475569; transition: background 0.15s ease; }" +
    ".bag-icon-btn:hover { background: #e2e8f0; }" +
    ".bag-icon-btn:disabled { opacity: 0.4; cursor: not-allowed; }" +
    ".bag-icon-btn.bag-send { background: #4f46e5; color: #fff; }" +
    ".bag-icon-btn.bag-send:hover { background: #4338ca; }" +
    ".bag-icon-btn.bag-mic.bag-recording { background: #ef4444; color: #fff; animation: bag-pulse 1.2s ease-in-out infinite; }" +
    "@keyframes bag-pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.5); } 50% { box-shadow: 0 0 0 8px rgba(239,68,68,0); } }" +
    ".bag-footer { text-align: center; font-size: 10px; color: #94a3b8; padding: 4px 0; background: #fff; flex-shrink: 0; }" +
    "@media (max-width: 420px) { .bag-panel { right: 16px; bottom: 88px; } .bag-launcher { right: 16px; bottom: 16px; } }";

  // ---------------------------------------------------------------------
  // Dynamic content observer (Phase 9): hashes the main content area and
  // reports changes — including SPA route changes — to /sync/observer so
  // the dashboard can queue a re-crawl without a manual sitemap submission.
  // ---------------------------------------------------------------------

  var ROUTE_CHANGE_EVENT = "bridgeon-agent:routechange";
  var CONTENT_CHECK_DEBOUNCE_MS = 800;
  var INITIAL_SIGNAL_DELAY_MS = 1000;

  function fnv1aHash(text) {
    var hash = 0x811c9dc5;
    for (var i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = (hash * 0x01000193) >>> 0;
    }
    return hash.toString(16);
  }

  // Monkey-patch history.pushState/replaceState (once per page) so SPA route
  // changes dispatch a window event the widget can react to, alongside the
  // native popstate event for back/forward navigation.
  function patchHistoryForRouteChanges() {
    if (window.__bridgeonAgentHistoryPatched) return;
    window.__bridgeonAgentHistoryPatched = true;

    var originalPushState = history.pushState;
    var originalReplaceState = history.replaceState;

    history.pushState = function () {
      var result = originalPushState.apply(this, arguments);
      window.dispatchEvent(new Event(ROUTE_CHANGE_EVENT));
      return result;
    };

    history.replaceState = function () {
      var result = originalReplaceState.apply(this, arguments);
      window.dispatchEvent(new Event(ROUTE_CHANGE_EVENT));
      return result;
    };

    window.addEventListener("popstate", function () {
      window.dispatchEvent(new Event(ROUTE_CHANGE_EVENT));
    });
  }

  // ---------------------------------------------------------------------
  // Widget element
  // ---------------------------------------------------------------------

  function defineWidget() {
    class BridgeonAgentWidgetEl extends HTMLElement {
      constructor() {
        super();
        this.shadow = this.attachShadow({ mode: "open" });
        this.messages = [];
        this.isOpen = false;
        this.isRecording = false;
        this.isBusy = false;
        this.recorder = null;
        this.audioEl = null;
        this.lastContentHash = null;
        this.contentCheckTimer = null;
      }

      connectedCallback() {
        this.companyId = this.getAttribute("company-id") || "";
        this.apiBase = this.getAttribute("api-base") || DEFAULT_API_BASE;
        this._render();
        this._loadCompany();
        this._setupContentObserver();
      }

      _render() {
        this.shadow.innerHTML =
          "<style>" + STYLES + "</style>" +
          '<button class="bag-launcher" aria-label="Open chat" type="button">' + ICON_CHAT + "</button>" +
          '<div class="bag-panel">' +
          '  <div class="bag-header">' +
          '    <div class="bag-header-info">' +
          '      <div class="bag-avatar" data-el="avatar">AI</div>' +
          "      <div>" +
          '        <div class="bag-title" data-el="title">AI Assistant</div>' +
          '        <div class="bag-subtitle" data-el="subtitle">Connecting&hellip;</div>' +
          "      </div>" +
          "    </div>" +
          '    <button class="bag-close" aria-label="Close chat" type="button">' + ICON_CLOSE + "</button>" +
          "  </div>" +
          '  <div class="bag-messages" data-el="messages"></div>' +
          '  <div class="bag-status" data-el="status"></div>' +
          '  <div class="bag-input-row">' +
          '    <input class="bag-input" data-el="input" type="text" placeholder="Type your message&hellip;" />' +
          '    <button class="bag-icon-btn bag-mic" data-el="mic" type="button" title="Record voice message">' + ICON_MIC + "</button>" +
          '    <button class="bag-icon-btn bag-send" data-el="send" type="button" title="Send">' + ICON_SEND + "</button>" +
          "  </div>" +
          '  <div class="bag-footer">Powered by Bridgeon AI Telecaller</div>' +
          "</div>";

        this.launcherEl = this.shadow.querySelector(".bag-launcher");
        this.panelEl = this.shadow.querySelector(".bag-panel");
        this.closeEl = this.shadow.querySelector(".bag-close");
        this.titleEl = this.shadow.querySelector('[data-el="title"]');
        this.subtitleEl = this.shadow.querySelector('[data-el="subtitle"]');
        this.avatarEl = this.shadow.querySelector('[data-el="avatar"]');
        this.messagesEl = this.shadow.querySelector('[data-el="messages"]');
        this.statusEl = this.shadow.querySelector('[data-el="status"]');
        this.inputEl = this.shadow.querySelector('[data-el="input"]');
        this.micEl = this.shadow.querySelector('[data-el="mic"]');
        this.sendEl = this.shadow.querySelector('[data-el="send"]');

        this.launcherEl.addEventListener("click", () => this._toggle());
        this.closeEl.addEventListener("click", () => this._toggle());
        this.sendEl.addEventListener("click", () => this._sendText());
        this.inputEl.addEventListener("keydown", (event) => {
          if (event.key === "Enter" && !this.isBusy) {
            event.preventDefault();
            this._sendText();
          }
        });
        this.micEl.addEventListener("click", () => this._toggleMic());

        if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) {
          this.micEl.disabled = true;
          this.micEl.title = "Voice input is not supported in this browser";
        }
      }

      _toggle() {
        this.isOpen = !this.isOpen;
        this.panelEl.classList.toggle("bag-open", this.isOpen);
        this.launcherEl.innerHTML = this.isOpen ? ICON_CLOSE : ICON_CHAT;
        if (this.isOpen) this.inputEl.focus();
      }

      _loadCompany() {
        if (!this.companyId) {
          this.subtitleEl.textContent = "No company configured";
          return;
        }

        fetch(this.apiBase + "/companies/" + encodeURIComponent(this.companyId))
          .then((response) => {
            if (!response.ok) throw new Error("company lookup failed");
            return response.json();
          })
          .then((company) => {
            this.company = company;
            this.titleEl.textContent = company.agent_name || "AI Assistant";
            this.subtitleEl.textContent = company.name || "";
            this.avatarEl.textContent = (company.agent_name || "AI").trim().charAt(0).toUpperCase() || "A";
            this._appendMessage(
              "assistant",
              "Hi! I'm " + (company.agent_name || "your assistant") + " from " + (company.name || "our team") +
                ". How can I help you today?"
            );
          })
          .catch(() => {
            this.titleEl.textContent = "AI Assistant";
            this.subtitleEl.textContent = "Currently unavailable";
            this._appendMessage("assistant", "Sorry, I'm temporarily unavailable. Please try again later.");
          });
      }

      _appendMessage(role, text) {
        var bubble = document.createElement("div");
        bubble.className = "bag-msg " + (role === "user" ? "bag-msg-user" : "bag-msg-assistant");
        bubble.textContent = text;
        this.messagesEl.appendChild(bubble);
        this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
      }

      _setStatus(text) {
        this.statusEl.textContent = text || "";
      }

      _setBusy(busy) {
        this.isBusy = busy;
        this.sendEl.disabled = busy;
        this.micEl.disabled = busy && !this.isRecording;
        this.inputEl.disabled = busy;
      }

      _sendText() {
        var text = this.inputEl.value.trim();
        if (!text || this.isBusy) return;

        this.inputEl.value = "";
        this._appendMessage("user", text);
        this.messages.push({ role: "user", content: text });
        this._setBusy(true);
        this._setStatus("Thinking…");

        fetch(this.apiBase + "/companies/" + encodeURIComponent(this.companyId) + "/playground/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: this.messages }),
        })
          .then((response) => {
            if (!response.ok) throw new Error("chat request failed");
            return response.json();
          })
          .then((data) => {
            this.messages.push(data.reply);
            this._appendMessage("assistant", data.reply.content);
          })
          .catch(() => {
            this._appendMessage("assistant", "Sorry, I'm having trouble connecting right now. Please try again in a moment.");
          })
          .finally(() => {
            this._setStatus("");
            this._setBusy(false);
          });
      }

      _toggleMic() {
        if (this.isRecording) {
          this._stopRecording();
        } else {
          this._startRecording();
        }
      }

      _startRecording() {
        this.recorder = new PcmRecorder();
        this.recorder
          .start()
          .then(() => {
            this.isRecording = true;
            this.micEl.classList.add("bag-recording");
            this.micEl.innerHTML = ICON_STOP;
            this.micEl.title = "Stop recording";
            this._setStatus("Listening…");
          })
          .catch(() => {
            this._setStatus("");
            this._appendMessage("assistant", "I couldn't access your microphone. Please check permissions and try again.");
          });
      }

      _stopRecording() {
        if (!this.recorder) return;

        var audioBlob = this.recorder.stop();
        this.recorder = null;
        this.isRecording = false;
        this.micEl.classList.remove("bag-recording");
        this.micEl.innerHTML = ICON_MIC;
        this.micEl.title = "Record voice message";
        this._submitVoice(audioBlob);
      }

      _submitVoice(audioBlob) {
        this._setBusy(true);
        this._setStatus("Thinking…");

        var formData = new FormData();
        formData.append("audio", audioBlob, "recording.wav");
        formData.append("history", JSON.stringify(this.messages));

        fetch(this.apiBase + "/companies/" + encodeURIComponent(this.companyId) + "/playground/voice", {
          method: "POST",
          body: formData,
        })
          .then((response) => {
            if (!response.ok) throw new Error("voice request failed");
            return response.json();
          })
          .then((data) => {
            this._appendMessage("user", data.transcript);
            this.messages.push({ role: "user", content: data.transcript });
            this._appendMessage("assistant", data.reply.content);
            this.messages.push(data.reply);
            this._setStatus("Speaking…");
            this._playAudio(data.audio_base64);
          })
          .catch(() => {
            this._appendMessage("assistant", "Sorry, I couldn't process that voice message. Please try again or type instead.");
            this._setStatus("");
          })
          .finally(() => {
            this._setBusy(false);
          });
      }

      _playAudio(base64Wav) {
        if (!this.audioEl) {
          this.audioEl = document.createElement("audio");
          this.shadow.appendChild(this.audioEl);
          this.audioEl.addEventListener("ended", () => this._setStatus(""));
          this.audioEl.addEventListener("error", () => this._setStatus(""));
        }
        this.audioEl.src = "data:audio/wav;base64," + base64Wav;
        this.audioEl.play().catch(() => this._setStatus(""));
      }

      _setupContentObserver() {
        if (!this.companyId) return;

        patchHistoryForRouteChanges();

        var scheduleCheck = () => {
          if (this.contentCheckTimer) clearTimeout(this.contentCheckTimer);
          this.contentCheckTimer = setTimeout(() => this._checkContentChange(), CONTENT_CHECK_DEBOUNCE_MS);
        };

        this.contentObserver = new MutationObserver(scheduleCheck);
        this.contentObserver.observe(document.body, {
          childList: true,
          subtree: true,
          characterData: true,
        });

        window.addEventListener(ROUTE_CHANGE_EVENT, scheduleCheck);

        // Send an initial signal shortly after mount so the dashboard's
        // "Dynamic Observer Logs" panel has data right away.
        setTimeout(() => this._checkContentChange(), INITIAL_SIGNAL_DELAY_MS);
      }

      _computeContentHash() {
        var root = document.querySelector("main") || document.body;
        return fnv1aHash(root.textContent || "");
      }

      _checkContentChange() {
        var hash = this._computeContentHash();
        if (hash === this.lastContentHash) return;
        this.lastContentHash = hash;
        this._sendObserverSignal(hash);
      }

      _sendObserverSignal(hash) {
        fetch(this.apiBase + "/companies/" + encodeURIComponent(this.companyId) + "/sync/observer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: window.location.href, content_hash: hash }),
        }).catch(function () {
          // Best-effort signal; ignore network errors.
        });
      }
    }

    customElements.define(TAG_NAME, BridgeonAgentWidgetEl);
  }

  defineWidget();

  // ---------------------------------------------------------------------
  // Auto-mount using the <script> tag's data-* attributes.
  // ---------------------------------------------------------------------

  var currentScript = document.currentScript;

  function mount() {
    if (document.querySelector(TAG_NAME)) return;

    var el = document.createElement(TAG_NAME);
    if (currentScript) {
      var companyId = currentScript.getAttribute("data-company-id");
      var apiBase = currentScript.getAttribute("data-api-base");
      if (companyId) el.setAttribute("company-id", companyId);
      if (apiBase) el.setAttribute("api-base", apiBase);
    }
    document.body.appendChild(el);
  }

  if (document.body) {
    mount();
  } else {
    document.addEventListener("DOMContentLoaded", mount);
  }
})();
