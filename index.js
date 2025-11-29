// index.js
// FYKINGDOM v0.2 — PiChordify demo (frontend only, no Pi SDK)

const FY = {
  audio: null,
  state: {
    currentSongId: null,
    isPlaying: false,
    scrollLocked: false,
    isMuted: false,
    lastVolume: 1,
    localFileSrc: null,
    localFileName: null
  },
  els: {},
  customSongId: "custom-current",
  songs: [
    {
      id: "tran-demo-01",
      title: "Tran682025 – Demo Jam",
      artist: "PiChordify Kingdom",
      bpm: 92,
      key: "G",
      mood: "Lo-fi / Worship",
      length: "3:45",
      src: "", // muốn có tiếng: upload MP3 và gán đường dẫn vào đây
      chords: `
[Intro]
G   D/F#   Em   C

[Verse 1]
G               D/F#
Ngày mai Pi sáng trên thành
Em                  C
Không còn ai phải đi bán linh hồn
G                     D/F#
Anh em ta viết nên bài ca mới
Em                        C
Chord vang đều trên vương quốc FY

[Chorus]
G              D/F#
PiChordify – cứ thế mà chơi
Em                 C
Không cần ví, chưa cần Pi Pay
G                D/F#
Frontend chạy, backend để sau
Em                      C
Tran682025 cười khẽ: "Thế là đủ rồi"

[Bridge]
Em                  D/F#
Nếu mai này API đổ về
G                    D
Ta chỉ việc gắn thêm cổng thanh toán
Em                       D/F#
Còn hôm nay, anh em ta thử nghiệm
C                      D
Demo chạy mượt là vui rồi đó.

[Outro]
G   D/F#   Em   C
G
`.trim()
    },
    {
      id: "tran-demo-02",
      title: "Focus Mode Practice",
      artist: "Tran682025",
      bpm: 75,
      key: "Dm",
      mood: "Slow practice",
      length: "4:12",
      src: "", // tương tự: thêm URL MP3 nếu muốn có tiếng sẵn
      chords: `
[Intro]
Dm   Bb   F   C

[Pattern]
Dm              Bb
Đánh chậm thôi, đừng vội
F                    C
Mỗi hợp âm neo lại một hơi thở
Dm                    Bb
Mắt nhìn chart, tai nghe nhịp
F                     C
Vương quốc FY – chỉ là phòng tập thử.

[Loop]
Dm   Bb   F   C  (x∞)
`.trim()
    }
  ]
};

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

document.addEventListener("DOMContentLoaded", () => {
  FY.init();
});

FY.init = function () {
  // cache main UI
  this.els.library = $("#fy-library");
  this.els.songList = $("#fy-song-list");
  this.els.title = $("#fy-song-title");
  this.els.meta = $("#fy-song-meta");
  this.els.chords = $("#fy-chord-sheet");
  this.els.playBtn = $("#fy-btn-play");
  this.els.pauseBtn = $("#fy-btn-pause");
  this.els.stopBtn = $("#fy-btn-stop");
  this.els.timeline = $("#fy-timeline");
  this.els.timelineFill = $("#fy-timeline-fill");
  this.els.timeCurrent = $("#fy-time-current");
  this.els.timeTotal = $("#fy-time-total");
  this.els.scrollToggle = $("#fy-scroll-toggle");
  this.els.scrollContainer = $("#fy-scroll-container") || this.els.chords;

  // volume / mute
  this.els.volume = $("#fy-volume");
  this.els.muteBtn = $("#fy-btn-mute");

  // custom editor inputs
  this.els.customTitle = $("#fy-input-title");
  this.els.customKey = $("#fy-select-key");
  this.els.customLyrics = $("#fy-input-lyrics");
  this.els.customPattern = $("#fy-input-pattern");
  this.els.customMp3 = $("#fy-input-mp3");
  this.els.loadCustomButton = $("#fy-btn-load-to-player");

  // MP3 file controls
  this.els.mp3FileInput = $("#fy-input-mp3-file");
  this.els.mp3SelectBtn = $("#fy-btn-select-mp3");
  this.els.mp3LoadBtn = $("#fy-btn-load-mp3");

  // logo modal
  this.els.logoBtn = $("#mk-logo-btn");
  this.els.logoModal = $("#mk-logo-modal");
  this.els.logoClose = $("#mk-logo-close");

  this.audio = new Audio();

  // restore volume / mute
  const savedVol = parseFloat(localStorage.getItem("fy_volume"));
  if (!isNaN(savedVol)) {
    this.audio.volume = clamp01(savedVol);
  } else {
    this.audio.volume = 1;
  }
  if (this.els.volume) {
    this.els.volume.value = this.audio.volume;
  }
  this.state.lastVolume = this.audio.volume || 1;

  const savedMuted = localStorage.getItem("fy_muted") === "1";
  if (savedMuted) {
    this.state.isMuted = true;
    this.audio.volume = 0;
    if (this.els.volume) this.els.volume.value = 0;
  }

  this.bindUI();
  this.updateMuteUI();
  this.renderLibrary();
  this.autoloadFirstSong();
};

FY.bindUI = function () {
  if (this.els.songList) {
    this.els.songList.addEventListener("click", (e) => {
      const item = e.target.closest("[data-song-id]");
      if (!item) return;
      const songId = item.getAttribute("data-song-id");
      this.selectSong(songId, true);
    });
  }

  if (this.els.playBtn) {
    this.els.playBtn.addEventListener("click", () => this.play());
  }
  if (this.els.pauseBtn) {
    this.els.pauseBtn.addEventListener("click", () => this.pause());
  }
  if (this.els.stopBtn) {
    this.els.stopBtn.addEventListener("click", () => this.stop());
  }

  if (this.els.timeline) {
    this.els.timeline.addEventListener("click", (e) => {
      if (!this.audio || !this.audio.duration) return;
      const rect = this.els.timeline.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      this.audio.currentTime = clamp01(ratio) * this.audio.duration;
    });
  }

  if (this.els.scrollToggle && this.els.scrollContainer) {
    this.els.scrollToggle.addEventListener("click", () => {
      this.state.scrollLocked = !this.state.scrollLocked;
      this.els.scrollToggle.textContent = this.state.scrollLocked
        ? "Auto-scroll: ON"
        : "Auto-scroll: OFF";
    });
  }

  if (this.audio) {
    this.audio.addEventListener("timeupdate", () => this.updateTime());
    this.audio.addEventListener("loadedmetadata", () => this.updateTime(true));
    this.audio.addEventListener("ended", () => {
      this.state.isPlaying = false;
      this.updatePlayState();
    });
  }

  // volume slider
  if (this.els.volume) {
    this.els.volume.addEventListener("input", (e) => {
      const v = clamp01(parseFloat(e.target.value) || 0);
      this.audio.volume = v;
      localStorage.setItem("fy_volume", String(v));

      if (v === 0) {
        this.state.isMuted = true;
        localStorage.setItem("fy_muted", "1");
      } else {
        this.state.lastVolume = v;
        this.state.isMuted = false;
        localStorage.setItem("fy_muted", "0");
      }
      this.updateMuteUI();
    });
  }

  // mute button
  if (this.els.muteBtn) {
    this.els.muteBtn.addEventListener("click", () => this.toggleMute());
  }

  // load custom song
  if (this.els.loadCustomButton) {
    this.els.loadCustomButton.addEventListener("click", () =>
      this.loadCustomSong()
    );
  }

  // MP3 file select
  if (this.els.mp3SelectBtn && this.els.mp3FileInput) {
    this.els.mp3SelectBtn.addEventListener("click", () => {
      this.els.mp3FileInput.click();
    });
    this.els.mp3FileInput.addEventListener("change", () => {
      const file = this.els.mp3FileInput.files?.[0];
      if (!file) return;
      // Tạo URL local để audio play được
      const blobUrl = URL.createObjectURL(file);
      this.state.localFileSrc = blobUrl;
      this.state.localFileName = file.name || "";
      if (this.els.customMp3) {
        this.els.customMp3.value = file.name || "";
      }
    });
  }

  // MP3 "Load" chip: chỉ cần đẩy sang player (giống Đưa sang player)
  if (this.els.mp3LoadBtn) {
    this.els.mp3LoadBtn.addEventListener("click", () => this.loadCustomSong());
  }

  // logo modal
  if (this.els.logoBtn && this.els.logoModal) {
    this.els.logoBtn.addEventListener("click", () => {
      this.els.logoModal.classList.add("is-open");
    });
  }
  if (this.els.logoClose && this.els.logoModal) {
    this.els.logoClose.addEventListener("click", () => {
      this.els.logoModal.classList.remove("is-open");
    });
  }
  if (this.els.logoModal) {
    this.els.logoModal.addEventListener("click", (e) => {
      if (e.target.classList.contains("logo-modal-backdrop")) {
        this.els.logoModal.classList.remove("is-open");
      }
    });
  }

  // auto-scroll loop
  let lastTime = performance.now();
  const scrollLoop = (now) => {
    const delta = now - lastTime;
    lastTime = now;

    if (
      this.state.scrollLocked &&
      this.state.isPlaying &&
      this.els.scrollContainer
    ) {
      this.els.scrollContainer.scrollTop += (delta / 1000) * 20;
    }

    requestAnimationFrame(scrollLoop);
  };
  requestAnimationFrame(scrollLoop);
};

FY.renderLibrary = function () {
  if (!this.els.songList) return;

  this.els.songList.innerHTML = "";
  this.songs.forEach((song) => {
    const li = document.createElement("button");
    li.className = "fy-song-item";
    li.type = "button";
    li.setAttribute("data-song-id", song.id);
    li.innerHTML = `
      <div class="fy-song-main">
        <span class="fy-song-title">${song.title}</span>
        <span class="fy-song-artist">${song.artist}</span>
      </div>
      <div class="fy-song-meta">
        <span>${song.key}</span>
        <span>${song.bpm} BPM</span>
        <span>${song.length}</span>
      </div>
    `.trim();
    this.els.songList.appendChild(li);
  });
};

FY.autoloadFirstSong = function () {
  if (!this.songs.length) return;
  const first = this.songs[0];
  this.selectSong(first.id, false);
};

FY.selectSong = function (songId, autoplay = false) {
  const song = this.songs.find((s) => s.id === songId);
  if (!song) return;

  this.state.currentSongId = songId;

  if (this.els.title) {
    this.els.title.textContent = song.title;
  }
  if (this.els.meta) {
    this.els.meta.textContent = `${song.artist} • Key ${song.key} • ${song.bpm} BPM • ${song.length}`;
  }

  if (this.els.chords) {
    this.els.chords.textContent = song.chords;
    if (this.els.scrollContainer) {
      this.els.scrollContainer.scrollTop = 0;
    }
  }

  if (this.els.songList) {
    $$(".fy-song-item", this.els.songList).forEach((btn) => {
      if (btn.getAttribute("data-song-id") === songId) {
        btn.classList.add("is-active");
      } else {
        btn.classList.remove("is-active");
      }
    });
  }

  if (this.audio) {
    if (song.src) {
      this.audio.src = song.src;
    } else {
      this.audio.removeAttribute("src");
      this.audio.currentTime = 0;
    }
  }

  if (autoplay) {
    this.play();
  } else {
    this.state.isPlaying = false;
    this.updatePlayState();
    this.updateTime(true);
  }
};

FY.loadCustomSong = function () {
  const titleInput =
    (this.els.customTitle && this.els.customTitle.value.trim()) || "";
  const key = this.els.customKey ? this.els.customKey.value : "?";
  const lyrics =
    (this.els.customLyrics && this.els.customLyrics.value.trim()) || "";
  const pattern =
    (this.els.customPattern && this.els.customPattern.value.trim()) || "";

  const typedSrc =
    (this.els.customMp3 && this.els.customMp3.value.trim()) || "";
  const src = this.state.localFileSrc || typedSrc;

  let autoTitle = "";
  if (!titleInput) {
    if (this.state.localFileName) {
      autoTitle = prettifyFilename(this.state.localFileName);
    } else if (typedSrc) {
      autoTitle = deriveNameFromUrl(typedSrc);
    }
  }

  const title = titleInput || autoTitle || "Bản custom";

  let chords = "";
  if (lyrics) {
    chords += "[Lyrics + Chords]\n" + lyrics + "\n\n";
  }
  if (pattern) {
    chords += "[Pattern]\n" + pattern + "\n";
  }
  if (!chords) {
    chords =
      "Chưa có nội dung hợp âm.\nHãy điền lời + hợp âm hoặc pattern ở panel bên trái rồi bấm 'Đưa sang player'.";
  }

  const song = {
    id: this.customSongId,
    title,
    artist: "FYKINGDOM user",
    bpm: 80,
    key,
    mood: "Custom",
    length: src ? "MP3" : "Demo",
    src,
    chords
  };

  const idx = this.songs.findIndex((s) => s.id === this.customSongId);
  if (idx >= 0) {
    this.songs[idx] = song;
  } else {
    this.songs.unshift(song);
  }

  this.renderLibrary();
  this.selectSong(this.customSongId, true);
};

FY.play = function () {
  if (!this.audio) return;

  if (this.audio.src) {
    this.audio
      .play()
      .then(() => {
        this.state.isPlaying = true;
        this.updatePlayState();
      })
      .catch((err) => {
        console.warn("Cannot play audio:", err);
      });
  } else {
    this.state.isPlaying = true;
    this.updatePlayState();
  }
};

FY.pause = function () {
  if (!this.audio) return;
  this.audio.pause();
  this.state.isPlaying = false;
  this.updatePlayState();
};

FY.stop = function () {
  if (!this.audio) return;
  this.audio.pause();
  this.audio.currentTime = 0;
  this.state.isPlaying = false;
  this.updatePlayState();
  this.updateTime(true);
};

FY.updatePlayState = function () {
  if (this.els.playBtn) {
    this.els.playBtn.disabled = this.state.isPlaying;
  }
  if (this.els.pauseBtn) {
    this.els.pauseBtn.disabled = !this.state.isPlaying;
  }
};

FY.updateTime = function (force = false) {
  if (!this.audio && !force) return;

  const current =
    this.audio && this.audio.currentTime ? this.audio.currentTime : 0;
  const duration =
    this.audio &&
    isFinite(this.audio.duration) &&
    this.audio.duration > 0
      ? this.audio.duration
      : 240;

  const ratio = duration ? current / duration : 0;

  if (this.els.timelineFill) {
    this.els.timelineFill.style.width = `${clamp01(ratio) * 100}%`;
  }

  if (this.els.timeCurrent) {
    this.els.timeCurrent.textContent = formatTime(current);
  }
  if (this.els.timeTotal) {
    this.els.timeTotal.textContent = formatTime(duration);
  }
};

FY.toggleMute = function () {
  if (!this.audio || !this.els.volume) return;

  if (this.state.isMuted) {
    const v = this.state.lastVolume > 0 ? this.state.lastVolume : 0.8;
    this.audio.volume = clamp01(v);
    this.els.volume.value = this.audio.volume;
    this.state.isMuted = false;
    localStorage.setItem("fy_volume", String(this.audio.volume));
    localStorage.setItem("fy_muted", "0");
  } else {
    this.state.lastVolume =
      this.audio.volume > 0 ? this.audio.volume : this.state.lastVolume || 0.8;
    this.audio.volume = 0;
    this.els.volume.value = 0;
    this.state.isMuted = true;
    localStorage.setItem("fy_volume", "0");
    localStorage.setItem("fy_muted", "1");
  }

  this.updateMuteUI();
};

FY.updateMuteUI = function () {
  if (!this.els.muteBtn) return;
  this.els.muteBtn.textContent = this.state.isMuted ? "Unmute" : "Mute";
};

/* helpers */

function formatTime(sec) {
  sec = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function clamp01(v) {
  if (isNaN(v)) return 0;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

function deriveNameFromUrl(url) {
  try {
    const u = new URL(url);
    return prettifyFilename(u.pathname);
  } catch (e) {
    return prettifyFilename(url);
  }
}

function prettifyFilename(path) {
  if (!path) return "";
  let name = path.split("/").filter(Boolean).pop() || "";
  name = name.split("?")[0].split("#")[0];
  name = name.replace(/\.[^/.]+$/, ""); // remove extension
  if (!name) return "";
  name = name.replace(/[_\-]+/g, " ");
  name = name.replace(/\s+/g, " ").trim();
  if (!name) return "";
  return name
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
