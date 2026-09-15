// Owner-review copy of the original PvP community entry.
"use strict";

const COMMUNITY_BOARD_ENTRY_CONFIG = Object.freeze({
  state: true,
  url: "/boards",
  allowedPath: "/boards",
});

const COMMUNITY_FEATURED_CHARACTER = Object.freeze({
  unitCode: "u1631e-sally",
  name: "かに座 サリー",
  image: "https://rangers.lerico.net/res/u1631e-sally/u1631e-sally-thum.png",
});

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
  } catch (_error) {
    return null;
  }
}

function textElement(tagName, className, text) {
  const element = document.createElement(tagName);
  element.className = className;
  element.textContent = text;
  return element;
}

function buildFeaturedCharacter() {
  const character = document.createElement("div");
  character.className = "community-board-entry-character";
  character.dataset.unitCode = COMMUNITY_FEATURED_CHARACTER.unitCode;

  const image = document.createElement("img");
  image.className = "community-board-entry-character-image";
  image.src = COMMUNITY_FEATURED_CHARACTER.image;
  image.alt = `${COMMUNITY_FEATURED_CHARACTER.name}のキャラクター画像`;
  image.width = 88;
  image.height = 88;
  image.loading = "eager";
  image.decoding = "async";

  const copy = document.createElement("div");
  copy.className = "community-board-entry-character-copy";
  copy.append(
    textElement("span", "community-board-entry-character-badge", "NEW CHARACTER"),
    textElement("strong", "community-board-entry-character-name", COMMUNITY_FEATURED_CHARACTER.name),
  );
  character.append(image, copy);
  return character;
}

function buildCommunityBoardEntry(url) {
  const card = document.createElement("section");
  card.className = "community-board-entry-card";
  card.setAttribute("aria-labelledby", "community-board-entry-title");

  const headingRow = document.createElement("div");
  headingRow.className = "community-board-entry-heading";
  const marker = textElement("span", "community-board-entry-marker", "●");
  marker.setAttribute("aria-hidden", "true");
  const headingText = document.createElement("div");
  headingText.className = "community-board-entry-heading-text";
  const title = textElement("h2", "community-board-entry-title", "新キャラ情報掲示板");
  title.id = "community-board-entry-title";
  headingText.append(
    title,
    textElement("p", "community-board-entry-description", "投票・コメント・動画で、新キャラについて話そう。"),
  );
  headingRow.append(marker, headingText);

  const featured = document.createElement("div");
  featured.className = "community-board-entry-featured";
  featured.append(
    textElement("strong", "community-board-entry-featured-label", "注目コメント"),
    textElement("p", "community-board-entry-featured-text", "最新の注目コメントは掲示板で確認できます。"),
  );

  const button = document.createElement("a");
  button.className = "community-board-entry-button";
  button.href = url;
  button.textContent = "掲示板を開く →";
  button.setAttribute("aria-label", "新キャラ情報掲示板を開く");

  card.append(headingRow, buildFeaturedCharacter(), featured, button);
  return card;
}

function renderCommunityBoardEntry() {
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

  slot.appendChild(buildCommunityBoardEntry(approvedUrl));
  slot.hidden = false;
}

document.addEventListener("DOMContentLoaded", renderCommunityBoardEntry);
