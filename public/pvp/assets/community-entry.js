// Owner-review copy of the original PvP community entry.
"use strict";

const COMMUNITY_BOARD_ENTRY_CONFIG = Object.freeze({
  state: true,
  url: "/boards",
  allowedPath: "/boards",
});

const COMMUNITY_ENTRY_I18N = Object.freeze({
  ja: Object.freeze({title:"新キャラ情報掲示板",description:"投票・コメント・写真・動画で、今月の新キャラについて話そう。",newCharacter:"新キャラクター",imageAlt:"新キャラクターの画像",featuredLabel:"注目コメント",featuredEmpty:"まだ注目コメントはありません。掲示板で最初の感想を投稿できます。",helpful:"役に立った",viewBoard:"掲示板で見る →",openBoard:"掲示板を開く →",openBoardAria:"新キャラ情報掲示板を開く",featuredAria:"注目コメントを掲示板で見る",newLabel:"新着"}),
  en: Object.freeze({title:"New Character Community Board",description:"Share thoughts about this month's new character through polls, comments, photos, and videos.",newCharacter:"NEW CHARACTER",imageAlt:"New character image",featuredLabel:"Featured comment",featuredEmpty:"No featured comments yet. Share your first thoughts on the board.",helpful:"Helpful",viewBoard:"View on board →",openBoard:"Open board →",openBoardAria:"Open the new character community board",featuredAria:"View the featured comment on the board",newLabel:"NEW"}),
  zh: Object.freeze({title:"新角色資訊討論區",description:"透過投票、留言、照片與影片，一起討論本月的新角色。",newCharacter:"新角色",imageAlt:"新角色圖片",featuredLabel:"精選留言",featuredEmpty:"目前還沒有精選留言。歡迎到討論區分享第一則心得。",helpful:"實用",viewBoard:"在討論區查看 →",openBoard:"開啟討論區 →",openBoardAria:"開啟新角色資訊討論區",featuredAria:"在討論區查看精選留言",newLabel:"新"}),
  th: Object.freeze({title:"กระดานข้อมูลตัวละครใหม่",description:"มาพูดคุยเกี่ยวกับตัวละครใหม่ประจำเดือนผ่านการโหวต ความคิดเห็น รูปภาพ และวิดีโอ",newCharacter:"ตัวละครใหม่",imageAlt:"รูปตัวละครใหม่",featuredLabel:"ความคิดเห็นเด่น",featuredEmpty:"ยังไม่มีความคิดเห็นเด่น มาแบ่งปันความรู้สึกแรกบนกระดานกันเถอะ",helpful:"มีประโยชน์",viewBoard:"ดูบนกระดาน →",openBoard:"เปิดกระดาน →",openBoardAria:"เปิดกระดานข้อมูลตัวละครใหม่",featuredAria:"ดูความคิดเห็นเด่นบนกระดาน",newLabel:"ใหม่"}),
  id: Object.freeze({title:"Papan Karakter Baru",description:"Bagikan pendapat tentang karakter baru bulan ini melalui jajak pendapat, komentar, foto, dan video.",newCharacter:"KARAKTER BARU",imageAlt:"Gambar karakter baru",featuredLabel:"Komentar unggulan",featuredEmpty:"Belum ada komentar unggulan. Bagikan kesan pertama Anda di papan.",helpful:"Bermanfaat",viewBoard:"Lihat di papan →",openBoard:"Buka papan →",openBoardAria:"Buka papan karakter baru",featuredAria:"Lihat komentar unggulan di papan",newLabel:"BARU"}),
  vi: Object.freeze({title:"Bảng thông tin nhân vật mới",description:"Hãy cùng thảo luận về nhân vật mới trong tháng qua bình chọn, bình luận, ảnh và video.",newCharacter:"NHÂN VẬT MỚI",imageAlt:"Hình ảnh nhân vật mới",featuredLabel:"Bình luận nổi bật",featuredEmpty:"Chưa có bình luận nổi bật. Hãy chia sẻ cảm nhận đầu tiên trên bảng.",helpful:"Hữu ích",viewBoard:"Xem trên bảng →",openBoard:"Mở bảng →",openBoardAria:"Mở bảng thông tin nhân vật mới",featuredAria:"Xem bình luận nổi bật trên bảng",newLabel:"MỚI"}),
  ko: Object.freeze({title:"신규 캐릭터 정보 게시판",description:"투표, 댓글, 사진과 동영상으로 이번 달 신규 캐릭터에 대해 이야기해 보세요.",newCharacter:"신규 캐릭터",imageAlt:"신규 캐릭터 이미지",featuredLabel:"주목 댓글",featuredEmpty:"아직 주목 댓글이 없습니다. 게시판에 첫 감상을 남겨 보세요.",helpful:"도움이 됐어요",viewBoard:"게시판에서 보기 →",openBoard:"게시판 열기 →",openBoardAria:"신규 캐릭터 정보 게시판 열기",featuredAria:"게시판에서 주목 댓글 보기",newLabel:"신규"}),
});
const COMMUNITY_ENTRY_LANGUAGES = Object.freeze(Object.keys(COMMUNITY_ENTRY_I18N));
let communityEntryLanguage = "ja";

const COMMUNITY_FALLBACK_TOPICS = Object.freeze([
  Object.freeze({
    id: "2026-09:u1631e-sally",
    character: "u1631e-sally",
    image: "https://rangers.lerico.net/res/u1631e-sally/u1631e-sally-thum.png",
    month: "2026-09",
  }),
]);

function detectCommunityLanguage() {
  let saved = null;
  try {
    saved = localStorage.getItem("line-rangers-language");
  } catch {
    saved = null;
  }
  if (COMMUNITY_ENTRY_LANGUAGES.includes(saved)) return saved;
  const pageLanguage = String(document.documentElement.lang || "").toLowerCase();
  if (pageLanguage.startsWith("ja")) return "ja";
  if (pageLanguage.startsWith("zh")) return "zh";
  if (pageLanguage.startsWith("th")) return "th";
  if (pageLanguage.startsWith("id")) return "id";
  if (pageLanguage.startsWith("vi")) return "vi";
  if (pageLanguage.startsWith("ko")) return "ko";
  const browser = String(navigator.language || "").toLowerCase();
  if (browser.startsWith("ja")) return "ja";
  if (browser.startsWith("zh")) return "zh";
  if (browser.startsWith("th")) return "th";
  if (browser.startsWith("id")) return "id";
  if (browser.startsWith("vi")) return "vi";
  if (browser.startsWith("ko")) return "ko";
  return "en";
}

function entryText(key) {
  return COMMUNITY_ENTRY_I18N[communityEntryLanguage][key];
}

function getApprovedCommunityBoardUrl(rawUrl, allowedPath) {
  if (typeof rawUrl !== "string" || typeof allowedPath !== "string") return null;
  try {
    const url = new URL(rawUrl, window.location.origin);
    if (
      url.origin !== window.location.origin ||
      url.username !== "" ||
      url.password !== "" ||
      url.search !== "" ||
      url.hash !== "" ||
      url.pathname !== allowedPath
    ) return null;
    return url.href;
  } catch {
    return null;
  }
}

function topicBoardUrl(topic) {
  if (!topic || typeof topic.id !== "string" || typeof topic.month !== "string") return null;
  if (!/^20\d{2}-(0[1-9]|1[0-2])$/.test(topic.month)) return null;
  if (!new RegExp(`^${topic.month.replace("-", "\\-")}:[A-Za-z0-9_-]+$`).test(topic.id)) return null;
  const url = new URL(COMMUNITY_BOARD_ENTRY_CONFIG.allowedPath, window.location.origin);
  url.searchParams.set("month", topic.month);
  url.searchParams.set("board", topic.id);
  return url.href;
}

function featuredBoardUrl(featured) {
  if (!featured || typeof featured.board !== "string") return null;
  const separator = featured.board.indexOf(":");
  if (separator <= 0) return null;
  const month = featured.board.slice(0, separator);
  return topicBoardUrl({ id: featured.board, month });
}

function textElement(tagName, className, text, translationKey) {
  const element = document.createElement(tagName);
  element.className = className;
  element.textContent = text;
  if (translationKey) element.dataset.communityText = translationKey;
  return element;
}

function clipText(value, max = 120) {
  const normalized = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1)}…`;
}

function normalizeTopics(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value.filter((topic) => {
    if (!topic || typeof topic !== "object") return false;
    if (typeof topic.id !== "string" || typeof topic.character !== "string" || typeof topic.image !== "string" || typeof topic.month !== "string") return false;
    if (!/^[A-Za-z0-9_-]+$/.test(topic.character) || seen.has(topic.id) || !topicBoardUrl(topic)) return false;
    try {
      const image = new URL(topic.image);
      if (image.protocol !== "https:" || image.hostname !== "rangers.lerico.net") return false;
    } catch {
      return false;
    }
    seen.add(topic.id);
    return true;
  });
}

function buildFeaturedCharacter(topic) {
  const href = topicBoardUrl(topic);
  const character = document.createElement(href ? "a" : "div");
  character.className = "community-board-entry-character";
  character.dataset.unitCode = topic.character;
  if (href) character.href = href;

  const image = document.createElement("img");
  image.className = "community-board-entry-character-image";
  image.src = topic.image;
  image.alt = entryText("imageAlt");
  image.dataset.communityAlt = "imageAlt";
  image.width = 88;
  image.height = 88;
  image.loading = "lazy";
  image.decoding = "async";

  const copy = document.createElement("div");
  copy.className = "community-board-entry-character-copy";
  copy.append(textElement("span", "community-board-entry-character-badge", entryText("newCharacter"), "newCharacter"));
  character.append(image, copy);
  return character;
}

function buildCharacterList(topics) {
  const list = document.createElement("div");
  list.className = "community-board-entry-character-list";
  for (const topic of topics) list.appendChild(buildFeaturedCharacter(topic));
  return list;
}

function buildFeatured(featured, fallbackUrl) {
  const href = featuredBoardUrl(featured) || fallbackUrl;
  const wrapper = document.createElement(href ? "a" : "div");
  wrapper.className = "community-board-entry-featured";
  if (href) {
    wrapper.href = href;
    wrapper.setAttribute("aria-label", entryText("featuredAria"));
    wrapper.dataset.communityAria = "featuredAria";
  }
  wrapper.appendChild(textElement("strong", "community-board-entry-featured-label", entryText("featuredLabel"), "featuredLabel"));
  if (featured && typeof featured.body === "string" && featured.body.trim()) {
    wrapper.appendChild(textElement("p", "community-board-entry-featured-text", clipText(featured.body)));
    const reactions = document.createElement("div");
    reactions.className = "community-board-entry-featured-reactions";
    const helpful = textElement("span", "", `👍 ${entryText("helpful")} ${Number(featured.helpful) || 0}`);
    helpful.dataset.communityHelpful = "true";
    helpful.dataset.helpfulCount = String(Number(featured.helpful) || 0);
    reactions.append(
      textElement("span", "", `♥ ${Number(featured.likes) || 0}`),
      helpful,
      textElement("span", "community-board-entry-featured-more", entryText("viewBoard"), "viewBoard"),
    );
    wrapper.appendChild(reactions);
  } else {
    wrapper.appendChild(textElement("p", "community-board-entry-featured-text", entryText("featuredEmpty"), "featuredEmpty"));
  }
  return wrapper;
}

function buildCommunityBoardEntry(url, state) {
  const card = document.createElement("section");
  card.className = "community-board-entry-card";
  card.setAttribute("aria-labelledby", "community-board-entry-title");

  const headingRow = document.createElement("div");
  headingRow.className = "community-board-entry-heading";
  const marker = textElement("span", "community-board-entry-marker", "●");
  marker.setAttribute("aria-hidden", "true");
  const headingText = document.createElement("div");
  headingText.className = "community-board-entry-heading-text";
  const titleRow = document.createElement("div");
  titleRow.className = "community-board-entry-title-row";
  const title = textElement("h2", "community-board-entry-title", entryText("title"), "title");
  title.id = "community-board-entry-title";
  titleRow.appendChild(title);
  if (Number(state.unread) > 0) {
    const unreadCount = Math.min(999, Number(state.unread));
    const unread = textElement("span", "community-board-entry-new", `${entryText("newLabel")} ${unreadCount}`, "newCount");
    unread.dataset.communityUnread = String(unreadCount);
    titleRow.appendChild(unread);
  }
  headingText.append(
    titleRow,
    textElement("p", "community-board-entry-description", entryText("description"), "description"),
  );
  headingRow.append(marker, headingText);

  const topics = state.topics.length ? state.topics : COMMUNITY_FALLBACK_TOPICS;
  const firstTopicUrl = topicBoardUrl(topics[0]);
  const button = document.createElement("a");
  button.className = "community-board-entry-button";
  button.href = firstTopicUrl || url;
  button.textContent = entryText("openBoard");
  button.dataset.communityText = "openBoard";
  button.setAttribute("aria-label", entryText("openBoardAria"));
  button.dataset.communityAria = "openBoardAria";

  card.append(headingRow, buildCharacterList(topics), buildFeatured(state.featured, firstTopicUrl || url), button);
  return card;
}

function updateCommunityEntryLanguage() {
  const slot = document.querySelector("#community-board-entry-slot");
  if (!slot) return;
  for (const element of slot.querySelectorAll("[data-community-text]")) {
    const key = element.dataset.communityText;
    if (!key) continue;
    element.textContent = key === "newCount"
      ? `${entryText("newLabel")} ${element.dataset.communityUnread || ""}`.trim()
      : entryText(key);
  }
  for (const element of slot.querySelectorAll("[data-community-alt]")) {
    element.alt = entryText(element.dataset.communityAlt || "imageAlt");
  }
  for (const element of slot.querySelectorAll("[data-community-aria]")) {
    element.setAttribute("aria-label", entryText(element.dataset.communityAria || "openBoardAria"));
  }
  for (const element of slot.querySelectorAll("[data-community-helpful]")) {
    element.textContent = `👍 ${entryText("helpful")} ${element.dataset.helpfulCount || "0"}`;
  }
}

function installCommunityLanguageSync() {
  for (const button of document.querySelectorAll("[data-language]")) {
    if (button.dataset.communityLanguageReady === "true") continue;
    button.dataset.communityLanguageReady = "true";
    button.addEventListener("click", () => {
      const language = button.dataset.language;
      if (!COMMUNITY_ENTRY_LANGUAGES.includes(language)) return;
      communityEntryLanguage = language;
      updateCommunityEntryLanguage();
    });
  }
}

async function loadCommunityEntryState() {
  const fallback = { topics: [...COMMUNITY_FALLBACK_TOPICS], featured: null, unread: 0 };
  try {
    const response = await fetch("/api/activity", { cache: "no-store", headers: { Accept: "application/json" } });
    if (!response.ok) return fallback;
    const activity = await response.json();
    let topics = normalizeTopics(activity.topics);
    if (!topics.length) topics = [...COMMUNITY_FALLBACK_TOPICS];
    try {
      const rankingResponse = await fetch("/pvp/data/character_usage.json", { cache: "default", headers: { Accept: "application/json" } });
      if (rankingResponse.ok) {
        const ranking = await rankingResponse.json();
        const usage = new Map();
        if (Array.isArray(ranking.characters)) {
          for (const row of ranking.characters) {
            if (!row || typeof row.unit_code !== "string") continue;
            usage.set(row.unit_code, {
              adoption: Number.isFinite(Number(row.adoption_rate)) ? Number(row.adoption_rate) : -1,
              rank: Number.isFinite(Number(row.rank)) ? Number(row.rank) : Number.MAX_SAFE_INTEGER,
            });
          }
        }
        topics = [...topics].sort((a, b) => {
          const av = usage.get(a.character), bv = usage.get(b.character);
          if (!!av !== !!bv) return av ? -1 : 1;
          if (av && bv && bv.adoption !== av.adoption) return bv.adoption - av.adoption;
          if (av && bv && av.rank !== bv.rank) return av.rank - bv.rank;
          return String(a.name || a.character).localeCompare(String(b.name || b.character), "ja");
        });
      }
    } catch {
      // PvP ordering is an enhancement. Community access still works if the
      // ranking snapshot is temporarily unavailable.
    }
    return {
      topics,
      featured: activity.featured && typeof activity.featured === "object" ? activity.featured : null,
      unread: Number.isFinite(Number(activity.unread)) ? Number(activity.unread) : 0,
    };
  } catch {
    return fallback;
  }
}

async function renderCommunityBoardEntry() {
  const slot = document.querySelector("#community-board-entry-slot");
  if (!slot) return;
  slot.replaceChildren();
  slot.hidden = true;
  if (COMMUNITY_BOARD_ENTRY_CONFIG.state !== true) return;

  const approvedUrl = getApprovedCommunityBoardUrl(
    COMMUNITY_BOARD_ENTRY_CONFIG.url,
    COMMUNITY_BOARD_ENTRY_CONFIG.allowedPath,
  );
  if (!approvedUrl) return;

  communityEntryLanguage = detectCommunityLanguage();
  const state = await loadCommunityEntryState();
  slot.appendChild(buildCommunityBoardEntry(approvedUrl, state));
  slot.hidden = false;
  updateCommunityEntryLanguage();
}

document.addEventListener("DOMContentLoaded", () => {
  installCommunityLanguageSync();
  void renderCommunityBoardEntry();
});
