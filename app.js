const catalogUrl = "./audio-catalog.json";

const elements = {
  audio: document.querySelector("#audio"),
  currentTime: document.querySelector("#currentTime"),
  duration: document.querySelector("#duration"),
  emptyState: document.querySelector("#emptyState"),
  groupTabs: document.querySelector("#groupTabs"),
  listMeta: document.querySelector("#listMeta"),
  listTitle: document.querySelector("#listTitle"),
  nextButton: document.querySelector("#nextButton"),
  playIcon: document.querySelector("#playIcon"),
  playPauseButton: document.querySelector("#playPauseButton"),
  playerSubtitle: document.querySelector("#playerSubtitle"),
  playerTitle: document.querySelector("#playerTitle"),
  prevButton: document.querySelector("#prevButton"),
  progress: document.querySelector("#progress"),
  searchInput: document.querySelector("#searchInput"),
  themeButton: document.querySelector("#themeButton"),
  trackList: document.querySelector("#trackList"),
};

const storageKeys = {
  activeTrack: "xiao-record.activeTrack",
  currentTime: "xiao-record.currentTime",
  theme: "xiao-record.theme",
};

let catalog = [];
let groups = [];
let activeGroup = "";
let activeTrackId = "";
let lastRenderedTracks = [];
let isSeeking = false;
let playbackHint = "";

function formatDuration(seconds = 0) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const rounded = Math.round(seconds);
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const secs = rounded % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

function formatChineseDuration(seconds = 0) {
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}小时${minutes}分`;
  return `${minutes}分钟`;
}

function titleForTrack(track) {
  return `第 ${track.group} 组 · ${track.name.replace(/\.mp3$/i, "")}`;
}

function fileTitleForTrack(track) {
  return track.name.replace(/\.mp3$/i, "");
}

function groupName(group) {
  return `第 ${group} 组`;
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(storageKeys.theme, theme);
}

function getActiveTrack() {
  return catalog.find((track) => track.id === activeTrackId) || null;
}

function getVisibleTracks() {
  return catalog.filter((track) => {
    const inGroup = !activeGroup || track.group === activeGroup;
    return inGroup;
  });
}

function renderGroups() {
  elements.groupTabs.innerHTML = "";
  groups.forEach((group) => {
    const button = document.createElement("button");
    button.className = "group-tab";
    button.type = "button";
    button.role = "tab";
    button.ariaSelected = String(group === activeGroup);
    button.innerHTML = `<strong>${groupName(group)}</strong>`;
    button.addEventListener("click", () => {
      activeGroup = group;
      render();
    });
    elements.groupTabs.append(button);
  });
}

function renderTracks() {
  const tracks = getVisibleTracks();
  lastRenderedTracks = tracks;
  elements.trackList.innerHTML = "";
  elements.emptyState.hidden = tracks.length > 0;
  elements.listTitle.textContent = groupName(activeGroup);
  elements.listMeta.textContent = `${tracks.length} 段 · ${formatChineseDuration(
    tracks.reduce((sum, track) => sum + track.duration, 0),
  )}`;

  tracks.forEach((track) => {
    const button = document.createElement("button");
    button.className = `track-row${track.id === activeTrackId ? " is-active" : ""}`;
    button.type = "button";
    button.innerHTML = `
      <span class="track-index">${String(track.trackNumber).padStart(2, "0")}</span>
      <span>
        <span class="track-title">${fileTitleForTrack(track)}</span>
      </span>
      <span class="track-duration">${formatDuration(track.duration)}</span>
    `;
    button.addEventListener("click", () => playTrack(track.id, true));
    elements.trackList.append(button);
  });
}

function renderPlayer() {
  const track = getActiveTrack();
  const isPlaying = !elements.audio.paused && !!track;

  elements.playIcon.textContent = isPlaying ? "Ⅱ" : "▶";
  elements.playPauseButton.setAttribute("aria-label", isPlaying ? "暂停" : "播放");

  if (!track) {
    elements.playerTitle.textContent = "选择一段录音";
    elements.playerSubtitle.textContent = "准备播放";
    return;
  }

  elements.playerTitle.textContent = titleForTrack(track);
  elements.playerSubtitle.textContent =
    playbackHint || `${groupName(track.group)} · ${formatDuration(track.duration)}`;
}

function render() {
  renderGroups();
  renderTracks();
  renderPlayer();
}

async function playTrack(trackId, shouldPlay) {
  const track = catalog.find((item) => item.id === trackId);
  if (!track) return;

  const isSameTrack = activeTrackId === trackId;
  activeTrackId = trackId;
  activeGroup = track.group;
  playbackHint = "";
  localStorage.setItem(storageKeys.activeTrack, trackId);

  if (!isSameTrack) {
    elements.audio.src = track.url;
    elements.progress.value = 0;
    elements.currentTime.textContent = "0:00";
    elements.duration.textContent = formatDuration(track.duration);
  }

  render();

  if (shouldPlay) {
    try {
      await elements.audio.play();
    } catch {
      playbackHint = "点播放键开始播放";
      renderPlayer();
    }
  }
}

function stepTrack(direction) {
  const pool = lastRenderedTracks.length ? lastRenderedTracks : catalog;
  const currentIndex = pool.findIndex((track) => track.id === activeTrackId);
  const nextIndex =
    currentIndex === -1
      ? 0
      : (currentIndex + direction + pool.length) % pool.length;
  const nextTrack = pool[nextIndex];
  if (nextTrack) playTrack(nextTrack.id, true);
}

function updateProgress() {
  if (isSeeking) return;
  const duration = elements.audio.duration || getActiveTrack()?.duration || 0;
  const current = elements.audio.currentTime || 0;
  elements.currentTime.textContent = formatDuration(current);
  elements.duration.textContent = formatDuration(duration);
  elements.progress.value = duration > 0 ? String((current / duration) * 1000) : "0";
  localStorage.setItem(storageKeys.currentTime, String(current));
}

function bindEvents() {
  elements.playPauseButton.addEventListener("click", async () => {
    const track = getActiveTrack() || catalog[0];
    if (!track) return;
    if (!activeTrackId) {
      await playTrack(track.id, true);
      return;
    }
    if (elements.audio.paused) {
      try {
        playbackHint = "";
        await elements.audio.play();
      } catch {
        playbackHint = "浏览器需要再点一次播放";
      }
    } else {
      elements.audio.pause();
    }
    renderPlayer();
  });

  elements.prevButton.addEventListener("click", () => stepTrack(-1));
  elements.nextButton.addEventListener("click", () => stepTrack(1));

  elements.themeButton.addEventListener("click", () => {
    const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
  });

  elements.audio.addEventListener("play", renderPlayer);
  elements.audio.addEventListener("pause", renderPlayer);
  elements.audio.addEventListener("timeupdate", updateProgress);
  elements.audio.addEventListener("loadedmetadata", updateProgress);
  elements.audio.addEventListener("ended", () => stepTrack(1));

  elements.progress.addEventListener("input", () => {
    isSeeking = true;
    const duration = elements.audio.duration || getActiveTrack()?.duration || 0;
    const nextTime = (Number(elements.progress.value) / 1000) * duration;
    elements.currentTime.textContent = formatDuration(nextTime);
  });

  elements.progress.addEventListener("change", () => {
    const duration = elements.audio.duration || getActiveTrack()?.duration || 0;
    elements.audio.currentTime = (Number(elements.progress.value) / 1000) * duration;
    isSeeking = false;
    updateProgress();
  });
}

async function init() {
  const savedTheme = localStorage.getItem(storageKeys.theme);
  setTheme(savedTheme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));

  const response = await fetch(catalogUrl);
  catalog = await response.json();
  groups = [...new Set(catalog.map((track) => track.group))].sort((a, b) => Number(a) - Number(b));
  activeGroup = groups[0] || "";

  const savedTrackId = localStorage.getItem(storageKeys.activeTrack);
  const savedTrack = catalog.find((track) => track.id === savedTrackId);
  if (savedTrack) {
    activeTrackId = savedTrack.id;
    activeGroup = savedTrack.group;
    elements.audio.src = savedTrack.url;
    elements.audio.currentTime = Number(localStorage.getItem(storageKeys.currentTime) || 0);
  }

  bindEvents();
  render();
}

init().catch(() => {
  elements.trackList.innerHTML = "";
  elements.emptyState.hidden = false;
  elements.emptyState.textContent = "录音目录暂时没有加载出来。";
});
