// PiChordify Kingdom — v0.4 core script

let mediaRecorder = null;
let recordedChunks = [];
let userRecordingUrl = null;

document.addEventListener("DOMContentLoaded", () => {
  // DOM refs
  const audioPlayer = document.getElementById("audioPlayer");
  const playBtn = document.getElementById("playBtn");
  const pauseBtn = document.getElementById("pauseBtn");
  const stopBtn = document.getElementById("stopBtn");
  const speedSlider = document.getElementById("speedSlider");
  const speedLabel = document.getElementById("speedLabel");
  const volumeSlider = document.getElementById("volumeSlider");

  const lyricsInput = document.getElementById("lyricsInput");
  const patternInput = document.getElementById("patternInput");
  const applyPatternBtn = document.getElementById("applyPatternBtn");
  const autoFillPatternBtn = document.getElementById("autoFillPatternBtn");
  const lyricsWithChordsOutput = document.getElementById("lyricsWithChordsOutput");
  const keyInput = document.getElementById("keyInput");
  const mp3FileInput = document.getElementById("mp3FileInput");
  const lyricsPreview = document.getElementById("lyricsPreview");

  const startRecBtn = document.getElementById("startRecBtn");
  const stopRecBtn = document.getElementById("stopRecBtn");
  const userRecordingAudio = document.getElementById("userRecordingAudio");
  const recStatusText = document.getElementById("recText");
  const recDot = document.getElementById("recDot");

  const helpModal = document.getElementById("helpModal");
  const openHelpBtn = document.getElementById("openHelpBtn");
  const closeHelpBtn = document.getElementById("closeHelpBtn");
  const tabButtons = document.querySelectorAll(".tab");
  const chipPresets = document.querySelectorAll(".btn-soft[data-preset]");

  // 1. Audio player basic behaviour
  audioPlayer.volume = parseFloat(volumeSlider.value);

  playBtn.addEventListener("click", () => {
    if (!audioPlayer.src) {
      // nếu chưa có src, lấy từ file input (nếu có) hoặc bỏ qua
      const file = mp3FileInput.files && mp3FileInput.files[0];
      if (file) {
        const url = URL.createObjectURL(file);
        audioPlayer.src = url;
      }
    }
    audioPlayer.play().catch(() => {});
  });

  pauseBtn.addEventListener("click", () => {
    audioPlayer.pause();
  });

  stopBtn.addEventListener("click", () => {
    audioPlayer.pause();
    audioPlayer.currentTime = 0;
  });

  speedSlider.addEventListener("input", () => {
    const val = parseFloat(speedSlider.value);
    audioPlayer.playbackRate = val;
    speedLabel.textContent = val.toFixed(2) + "×";
  });

  volumeSlider.addEventListener("input", () => {
    audioPlayer.volume = parseFloat(volumeSlider.value);
  });

  mp3FileInput.addEventListener("change", () => {
    const file = mp3FileInput.files && mp3FileInput.files[0];
    if (!file) return;
    if (audioPlayer.src) URL.revokeObjectURL(audioPlayer.src);
    const url = URL.createObjectURL(file);
    audioPlayer.src = url;
  });

  // 2. Pattern helpers
  chipPresets.forEach(chip => {
    chip.addEventListener("click", () => {
      patternInput.value = chip.dataset.preset || "";
      patternInput.focus();
    });
  });

  autoFillPatternBtn.addEventListener("click", () => {
    const key = (keyInput.value || "").trim().toUpperCase();
    let pattern = "";

    // gợi ý cực basic theo key
    if (key === "G") pattern = "G D Em C";
    else if (key === "C") pattern = "C G Am F";
    else if (key === "D") pattern = "D A Bm G";
    else if (key === "E") pattern = "E B C#m A";
    else if (key === "A") pattern = "A E F#m D";
    else pattern = "C G Am F";

    patternInput.value = pattern;
  });

  applyPatternBtn.addEventListener("click", () => {
    const rawLyrics = lyricsInput.value;
    const rawPattern = patternInput.value;

    const pattern = parsePattern(rawPattern);
    if (!pattern.length) {
      lyricsWithChordsOutput.textContent =
        "[lỗi] Chưa có pattern hợp âm. Hãy nhập ví dụ: C G Am F";
      return;
    }

    const result = applyPatternToLyrics(rawLyrics, pattern);
    lyricsWithChordsOutput.textContent = result || "[trống] Chưa có dòng hợp lệ.";
    lyricsPreview.textContent = result || lyricsPreview.textContent;
  });

  // 3. Recording
  startRecBtn.addEventListener("click", startRecording);
  stopRecBtn.addEventListener("click", stopRecording);

  async function startRecording() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Trình duyệt không hỗ trợ ghi âm (MediaRecorder).");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordedChunks = [];
      mediaRecorder = new MediaRecorder(stream);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: "audio/webm" });
        if (userRecordingUrl) URL.revokeObjectURL(userRecordingUrl);
        userRecordingUrl = URL.createObjectURL(blob);
        userRecordingAudio.src = userRecordingUrl;
        userRecordingAudio.play().catch(() => {});
        recDot.style.display = "none";
        recStatusText.textContent = "Đã thu xong · có thể phát lại";
      };

      mediaRecorder.start();
      recDot.style.display = "inline-block";
      recStatusText.textContent = "Đang thu… nói hoặc hát vào mic";

      // option: nếu muốn tự play beat khi bắt đầu thu
      if (!audioPlayer.paused) {
        // đã đang chơi
      } else {
        audioPlayer.play().catch(() => {});
      }
    } catch (err) {
      console.error("startRecording error", err);
      alert("Không thể truy cập micro: " + err.message);
    }
  }

  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    } else {
      recDot.style.display = "none";
      recStatusText.textContent = "Idle";
    }
  }

  // 4. Help modal
  openHelpBtn.addEventListener("click", () => {
    helpModal.style.display = "flex";
  });
  closeHelpBtn.addEventListener("click", () => {
    helpModal.style.display = "none";
  });
  helpModal.addEventListener("click", (e) => {
    if (e.target === helpModal) helpModal.style.display = "none";
  });

  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.helpTab;
      tabButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      document.querySelectorAll("[data-help-content]").forEach(el => {
        el.style.display = el.dataset.helpContent === tab ? "block" : "none";
      });
    });
  });
});

/**
 * Parse pattern string ("C G Am F") to array ["C","G","Am","F"]
 */
function parsePattern(rawPattern) {
  if (!rawPattern) return [];
  return rawPattern
    .split(/\s+/)
    .map(ch => ch.trim())
    .filter(Boolean);
}

/**
 * Apply pattern to lyrics.
 * Each non-empty line will get a chord from pattern[index % len].
 * If line already contains chord-like tokens at end, we still append pattern chord.
 */
function applyPatternToLyrics(rawLyrics, pattern) {
  if (!rawLyrics.trim()) return "";
  const lines = rawLyrics.split(/\r?\n/);
  const outLines = [];
  let chordIndex = 0;

  for (const line of lines) {
    if (!line.trim()) {
      outLines.push("");
      continue;
    }

    const chord = pattern[chordIndex % pattern.length];
    chordIndex++;

    // If timestamp present, keep it at left
    const matchTs = line.match(/^(\s*\[[0-9:.]+\]\s*)(.*)$/);
    if (matchTs) {
      const ts = matchTs[1];
      const rest = matchTs[2];
      outLines.push(`${ts}${rest}    ${chord}`);
    } else {
      outLines.push(`${line}    ${chord}`);
    }
  }

  return outLines.join("\n");
}
