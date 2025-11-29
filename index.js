// index.js
// FYKINGDOM V01 – PiChordify demo (frontend only, no Pi Pay, no wallet)

// Simple namespace to avoid globals
const FY = {
  audio: null,
  state: {
    currentSongId: null,
    isPlaying: false,
    scrollLocked: false
  },
  els: {},
  songs: [
    {
      id: "tran-demo-01",
      title: "Tran682025 – Demo Jam",
      artist: "PiChordify Kingdom",
      bpm: 92,
      key: "G",
      mood: "Lo-fi / Worship",
      length: "3:45",
      // You can swap this with a real MP3/OGG URL later
      src: "",
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
      src: "",
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

// Shortcuts
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

document.addEventListener("DOMContentLoaded", () => {
  FY.init();
});

FY.init = function () {
  // Cache elements – nếu trong HTML thiếu cái nào cũng không sao, code sẽ bỏ qua.
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

  this.audio = new Audio();
  this.bindUI();
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
      this.audio.currentTime = ratio * this.audio.duration;
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

  // Simple auto-scroll loop
  let lastTime = performance.now();
  const scrollLoop = (now) => {
    const delta = now - lastTime;
    lastTime = now;

    if (
      this.state.scrollLocked &&
      this.state.isPlaying &&
      this.els.scrollContainer
    ) {
      this.els.scrollContainer.scrollTop += (delta / 1000) * 20; // 20px per second
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

  // Highlight current
  if (this.els.songList) {
    $$(".fy-song-item", this.els.songList).forEach((btn) => {
      if (btn.getAttribute("data-song-id") === songId) {
        btn.classList.add("is-active");
      } else {
        btn.classList.remove("is-active");
      }
    });
  }

  // Audio – only if src exists
  if (this.audio) {
    if (song.src) {
      this.audio.src = song.src;
    } else {
      // Nếu chưa có file audio, dùng fake length 240s để demo timeline
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
    // No audio file – giả lập play state cho demo
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

  const current = this.audio && this.audio.currentTime ? this.audio.currentTime : 0;
  const duration =
    this.audio && isFinite(this.audio.duration) && this.audio.duration > 0
      ? this.audio.duration
      : 240; // giả lập 4 phút nếu chưa có metadata

  const ratio = duration ? current / duration : 0;

  if (this.els.timelineFill) {
    this.els.timelineFill.style.width = `${Math.min(Math.max(ratio, 0), 1) * 100}%`;
  }

  if (this.els.timeCurrent) {
    this.els.timeCurrent.textContent = formatTime(current);
  }
  if (this.els.timeTotal) {
    this.els.timeTotal.textContent = formatTime(duration);
  }
};

function formatTime(sec) {
  sec = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
