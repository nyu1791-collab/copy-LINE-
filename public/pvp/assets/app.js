"use strict";

const DATA_PATH = "./data/character_usage.json";
const TARGET_PLAYERS = 200;
const AUTO_REFRESH_MS = 10 * 60 * 1000;
const SAFE_CODE = /^[A-Za-z0-9_-]+$/;
const ASSET_ORIGIN = "https://rangers.lerico.net";
const PERIODS = ["hour", "day", "week", "month"];

const LABELS = {
  ja: {title:"LINEレンジャー レジェンド帯キャラ集計",desc:"レジェンド帯プレイヤーの防衛チームから、キャラクターの編成数と採用率を集計しています。",tap:"キャラクターをタップすると、装備ランキングが見れます。",league:"リーグ",slots:"全編成キャラ数",updated:"最終更新",ranking:"キャラクターランキング",rankingDesc:"編成数が多い順に表示しています。",comparison:"とのキャラ数比較",rank:"順位",character:"キャラクター",occ:"編成数",players:"採用人数",rate:"採用率",healthy:"正常更新",delayed:"更新が少し遅れています",stale:"前回の正常データを表示中",pending:"履歴待ち",loading:"集計データを読み込んでいます。",loadError:"ランキングを取得できません。掲示板はそのまま利用できます。",dialog:"キャラクター装備ランキング",dialogDesc:"装備数は同じキャラを複数編成した分も数え、使用率は同じプレイヤーを1人として計算します。",weapon:"武器",armor:"防具",acc:"アクセサリー",equipment:"装備",equipmentCount:"装備数",equipmentPlayers:"使用人数",none:"このカテゴリの装備データはありません。",close:"閉じる",result:n=>`${n}件`,period:{hour:"1時間前",day:"前日締め",week:"先週締め",month:"先月締め"}},
  en: {title:"LINE Rangers Legend Tier Character Statistics",desc:"Character team counts and usage rates are calculated from defense teams of Legend-tier players.",tap:"Tap a character to view its equipment ranking.",league:"League",slots:"Total Character Slots",updated:"Last Updated",ranking:"Character Ranking",rankingDesc:"Sorted by team count.",comparison:"character count comparison",rank:"Rank",character:"Character",occ:"Team Count",players:"Players Using",rate:"Usage Rate",healthy:"Up to date",delayed:"Update delayed",stale:"Showing last verified data",pending:"History pending",loading:"Loading statistics...",loadError:"Ranking data is unavailable. The community board remains available.",dialog:"Character Equipment Ranking",dialogDesc:"Every character copy counts toward equipment count; each player counts once for usage rate.",weapon:"Weapon",armor:"Armor",acc:"Accessory",equipment:"Equipment",equipmentCount:"Equipment count",equipmentPlayers:"Players using",none:"No equipment data is available for this category.",close:"Close",result:n=>`${n} characters`,period:{hour:"1 hour ago",day:"Previous-day close",week:"Previous-week close",month:"Previous-month close"}},
  zh: {title:"LINE Rangers 傳奇聯盟角色統計",desc:"根據傳奇聯盟玩家的防守隊伍，統計角色的編成數與使用率。",tap:"點選角色即可查看裝備排名。",league:"聯盟",slots:"角色總編成數",updated:"最後更新",ranking:"角色排名",rankingDesc:"依編成數由高至低排列。",comparison:"角色數量比較",rank:"排名",character:"角色",occ:"編成數",players:"使用人數",rate:"使用率",healthy:"更新正常",delayed:"更新稍有延遲",stale:"顯示上次驗證資料",pending:"等待歷史資料",loading:"正在載入統計資料……",loadError:"無法取得排行資料，討論區仍可使用。",dialog:"角色裝備排行",dialogDesc:"裝備數會計入重複編成；使用率則以每位玩家僅計一次。",weapon:"武器",armor:"防具",acc:"飾品",equipment:"裝備",equipmentCount:"裝備數",equipmentPlayers:"使用人數",none:"此分類沒有裝備資料。",close:"關閉",result:n=>`${n}項`,period:{hour:"1小時前",day:"前日結算",week:"上週結算",month:"上月結算"}},
  th: {title:"สถิติตัวละคร LINE Rangers ระดับ Legend",desc:"สถิติจำนวนการจัดทีมและอัตราการใช้งานตัวละครจากทีมป้องกันของผู้เล่นระดับ Legend",tap:"แตะตัวละครเพื่อดูอันดับอุปกรณ์",league:"ลีก",slots:"จำนวนตัวละครทั้งหมด",updated:"อัปเดตล่าสุด",ranking:"อันดับตัวละคร",rankingDesc:"เรียงตามจำนวนการจัดทีมจากมากไปน้อย",comparison:"เปรียบเทียบจำนวนตัวละคร",rank:"อันดับ",character:"ตัวละคร",occ:"จำนวนการจัดทีม",players:"จำนวนผู้ใช้",rate:"อัตราการใช้",healthy:"อัปเดตปกติ",delayed:"การอัปเดตล่าช้า",stale:"แสดงข้อมูลล่าสุดที่ตรวจสอบแล้ว",pending:"รอประวัติข้อมูล",loading:"กำลังโหลดข้อมูลสถิติ...",loadError:"โหลดอันดับไม่ได้ แต่กระดานชุมชนยังใช้ได้",dialog:"อันดับอุปกรณ์ตัวละคร",dialogDesc:"จำนวนอุปกรณ์นับตัวละครที่ซ้ำ ส่วนอัตราใช้จะนับผู้เล่นเพียงครั้งเดียว",weapon:"อาวุธ",armor:"เกราะ",acc:"เครื่องประดับ",equipment:"อุปกรณ์",equipmentCount:"จำนวนอุปกรณ์",equipmentPlayers:"ผู้ใช้",none:"ไม่มีข้อมูลอุปกรณ์สำหรับหมวดหมู่นี้",close:"ปิด",result:n=>`${n} รายการ`,period:{hour:"1 ชั่วโมงก่อน",day:"ปิดยอดวันก่อน",week:"ปิดยอดสัปดาห์ก่อน",month:"ปิดยอดเดือนก่อน"}},
  id: {title:"Statistik Karakter LINE Rangers Tier Legend",desc:"Jumlah penggunaan karakter dan tingkat penggunaan dihitung dari tim pertahanan pemain Tier Legend.",tap:"Ketuk karakter untuk melihat peringkat perlengkapannya.",league:"Liga",slots:"Total Slot Karakter",updated:"Terakhir Diperbarui",ranking:"Peringkat Karakter",rankingDesc:"Diurutkan berdasarkan jumlah penggunaan.",comparison:"perbandingan jumlah karakter",rank:"Peringkat",character:"Karakter",occ:"Jumlah Penggunaan",players:"Pemain yang Menggunakan",rate:"Tingkat Penggunaan",healthy:"Pembaruan normal",delayed:"Pembaruan terlambat",stale:"Menampilkan data terverifikasi terakhir",pending:"Menunggu riwayat",loading:"Memuat statistik...",loadError:"Data peringkat tidak tersedia. Papan komunitas tetap dapat digunakan.",dialog:"Peringkat Perlengkapan Karakter",dialogDesc:"Jumlah perlengkapan menghitung karakter ganda, sedangkan tingkat penggunaan menghitung tiap pemain sekali.",weapon:"Senjata",armor:"Pelindung",acc:"Aksesori",equipment:"Perlengkapan",equipmentCount:"Jumlah perlengkapan",equipmentPlayers:"Pemain pengguna",none:"Tidak ada data perlengkapan untuk kategori ini.",close:"Tutup",result:n=>`${n} karakter`,period:{hour:"1 jam lalu",day:"Penutupan hari sebelumnya",week:"Penutupan minggu lalu",month:"Penutupan bulan lalu"}},
  vi: {title:"Thống kê nhân vật LINE Rangers hạng Legend",desc:"Thống kê số lần xếp đội và tỷ lệ sử dụng nhân vật từ đội phòng thủ của người chơi hạng Legend.",tap:"Chạm vào nhân vật để xem xếp hạng trang bị.",league:"Giải đấu",slots:"Tổng số nhân vật",updated:"Cập nhật lần cuối",ranking:"Xếp hạng nhân vật",rankingDesc:"Sắp xếp theo số lần xếp đội từ cao xuống thấp.",comparison:"so sánh số nhân vật",rank:"Hạng",character:"Nhân vật",occ:"Số lần xếp đội",players:"Số người sử dụng",rate:"Tỷ lệ sử dụng",healthy:"Cập nhật bình thường",delayed:"Cập nhật bị chậm",stale:"Hiển thị dữ liệu đã xác minh gần nhất",pending:"Đang chờ lịch sử",loading:"Đang tải dữ liệu thống kê...",loadError:"Không tải được xếp hạng. Bảng cộng đồng vẫn dùng được.",dialog:"Xếp hạng trang bị nhân vật",dialogDesc:"Số trang bị tính cả nhân vật trùng lặp, còn tỷ lệ sử dụng chỉ tính mỗi người chơi một lần.",weapon:"Vũ khí",armor:"Giáp",acc:"Phụ kiện",equipment:"Trang bị",equipmentCount:"Số trang bị",equipmentPlayers:"Người sử dụng",none:"Không có dữ liệu trang bị cho danh mục này.",close:"Đóng",result:n=>`${n} nhân vật`,period:{hour:"1 giờ trước",day:"Chốt ngày trước",week:"Chốt tuần trước",month:"Chốt tháng trước"}},
  ko: {title:"LINE Rangers 레전드 티어 캐릭터 통계",desc:"레전드 티어 플레이어의 방어팀을 기준으로 캐릭터 편성 수와 사용률을 집계합니다.",tap:"캐릭터를 탭하면 장비 순위를 볼 수 있습니다.",league:"리그",slots:"전체 캐릭터 편성 수",updated:"최종 업데이트",ranking:"캐릭터 순위",rankingDesc:"편성 수가 많은 순서로 표시합니다.",comparison:"캐릭터 수 비교",rank:"순위",character:"캐릭터",occ:"편성 수",players:"사용 인원",rate:"사용률",healthy:"정상 업데이트",delayed:"업데이트가 지연되었습니다",stale:"마지막 정상 데이터를 표시 중",pending:"기록 대기",loading:"통계 데이터를 불러오는 중입니다...",loadError:"순위 데이터를 불러올 수 없습니다. 게시판은 계속 사용할 수 있습니다.",dialog:"캐릭터 장비 순위",dialogDesc:"장비 수는 중복 편성도 모두 세고, 사용률은 플레이어를 한 명으로만 계산합니다.",weapon:"무기",armor:"방어구",acc:"액세서리",equipment:"장비",equipmentCount:"장비 수",equipmentPlayers:"사용 인원",none:"이 분류의 장비 데이터가 없습니다.",close:"닫기",result:n=>`${n}건`,period:{hour:"1시간 전",day:"전일 마감",week:"전주 마감",month:"전월 마감"}}
};

let data = null;
let language = "ja";
let period = "day";
let selectedCharacter = null;
let selectedEquipment = "WEAPON";
const $ = id => document.getElementById(id);
const text = () => LABELS[language] || LABELS.ja;

function trustedImage(value, code, equipment = false) {
  if (typeof value !== "string" || !SAFE_CODE.test(String(code || ""))) return false;
  try {
    const url = new URL(value);
    if (url.origin !== ASSET_ORIGIN || url.search || url.hash) return false;
    const expected = equipment
      ? `/res/${code}/${code}-icon.png`
      : `/res/${code}/${code}-thum.png`;
    return url.pathname === expected;
  } catch { return false; }
}

function validInteger(value, min, max) {
  return Number.isSafeInteger(value) && value >= min && value <= max;
}

function validate(payload) {
  if (!payload || typeof payload !== "object" || !Array.isArray(payload.characters)) return false;
  if (payload.target_players !== TARGET_PLAYERS || payload.sampled_players !== TARGET_PLAYERS || payload.complete_target !== true) return false;
  if (!validInteger(payload.character_slots, TARGET_PLAYERS, TARGET_PLAYERS * 10)) return false;
  if (!validInteger(payload.unique_characters, 1, payload.character_slots) || payload.unique_characters !== payload.characters.length) return false;
  if (payload.collection_quality?.detail_fetch_failures !== 0 || payload.collection_quality?.invalid_player_records !== 0) return false;
  let total = 0;
  const seen = new Set();
  for (const row of payload.characters) {
    if (!row || !SAFE_CODE.test(String(row.unit_code || "")) || seen.has(row.unit_code)) return false;
    seen.add(row.unit_code);
    if (!trustedImage(row.image, row.unit_code)) return false;
    if (typeof row.name !== "string" || !row.name.trim()) return false;
    if (!validInteger(row.occurrence_count, 1, payload.character_slots)) return false;
    if (!validInteger(row.player_count, 1, TARGET_PLAYERS) || row.player_count > row.occurrence_count) return false;
    const expectedRate = Math.round((row.player_count / TARGET_PLAYERS) * 1000) / 10;
    if (!Number.isFinite(row.adoption_rate) || Math.abs(row.adoption_rate - expectedRate) > 0.11) return false;
    total += row.occurrence_count;
  }
  return total === payload.character_slots;
}

function formatNumber(value) { return new Intl.NumberFormat(language === "zh" ? "zh-TW" : language).format(Number(value) || 0); }
function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(language === "zh" ? "zh-TW" : language, {year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",timeZone:"Asia/Tokyo"}).format(date) + " JST";
}
function freshness(value) {
  const age = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(age) || age >= 4 * 60 * 60 * 1000) return [text().stale, "freshness-stale"];
  if (age >= 2 * 60 * 60 * 1000) return [text().delayed, "freshness-delayed"];
  return [text().healthy, "freshness-healthy"];
}
function change(row) {
  const ref = row?.change?.periods?.[period];
  if (!ref || ref.comparable !== true || !Number.isSafeInteger(ref.occurrence_count)) return {label:text().pending, cls:"rank-period-pending"};
  const n = ref.occurrence_count;
  return {label:n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "±0", cls:n > 0 ? "rank-period-up" : n < 0 ? "rank-period-down" : "rank-period-neutral"};
}
function imageFor(row, className) {
  const frame = document.createElement("span");
  frame.className = `${className} character-image-frame`;
  const img = document.createElement("img");
  img.src = row.image;
  img.alt = row.name;
  img.width = 64;
  img.height = 64;
  img.loading = row.rank && row.rank <= 8 ? "eager" : "lazy";
  img.decoding = "async";
  frame.appendChild(img);
  return frame;
}

function applyLanguage() {
  const t = text();
  document.documentElement.lang = language === "zh" ? "zh-TW" : language;
  document.title = t.title;
  $("page-title").textContent = t.title;
  $("page-description").textContent = t.desc;
  $("ranking-tap-hint").textContent = t.tap;
  $("label-league").textContent = t.league;
  $("label-slots").textContent = t.slots;
  $("label-updated").textContent = t.updated;
  $("ranking-title").textContent = t.ranking;
  $("ranking-description").textContent = t.rankingDesc;
  $("rank-period-comparison-label").textContent = t.comparison;
  $("th-rank").textContent = t.rank;
  $("th-character").textContent = t.character;
  $("th-occurrence").textContent = t.occ;
  $("th-players").textContent = t.players;
  $("th-rate").textContent = t.rate;
  $("rank-period-current").textContent = t.period[period];
  document.querySelectorAll("[data-rank-period]").forEach(button => {
    button.textContent = t.period[button.dataset.rankPeriod];
    button.classList.toggle("rank-period-selected", button.dataset.rankPeriod === period);
    button.setAttribute("aria-selected", String(button.dataset.rankPeriod === period));
  });
  document.querySelectorAll("[data-language]").forEach(button => button.classList.toggle("language-active", button.dataset.language === language));
  if (data) render();
}

function render() {
  const t = text();
  $("summary-league").textContent = data.league || "LEGEND";
  $("summary-slots").textContent = formatNumber(data.character_slots);
  $("summary-updated").textContent = formatDate(data.updated_at);
  const [freshLabel, freshClass] = freshness(data.updated_at);
  $("summary-freshness").textContent = freshLabel;
  $("summary-freshness").className = `freshness-badge ${freshClass}`;
  $("summary-health").textContent = `${data.sampled_players}/${data.target_players}人・取得エラー0`;
  $("summary").hidden = false;
  $("ranking-section").hidden = false;
  $("status-message").hidden = true;
  $("rank-period-current").textContent = t.period[period];

  const body = $("ranking-body");
  body.replaceChildren();
  for (const row of data.characters) {
    const tr = document.createElement("tr");
    const rankCell = document.createElement("td");
    rankCell.className = "rank-cell";
    const rank = document.createElement("span");
    rank.className = "rank-number";
    rank.textContent = String(row.rank || "-");
    const delta = change(row);
    const deltaList = document.createElement("span");
    deltaList.className = "rank-period-changes";
    const badge = document.createElement("span");
    badge.className = `rank-period-change ${delta.cls}`;
    badge.textContent = delta.label;
    badge.title = `${t.period[period]}: ${delta.label}`;
    deltaList.appendChild(badge);
    rankCell.append(rank, deltaList);

    const characterCell = document.createElement("td");
    characterCell.className = "character-cell original-character-cell";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "character-button";
    button.dataset.unitCode = row.unit_code;
    button.setAttribute("aria-label", `${row.name}: ${t.dialog}`);
    button.appendChild(imageFor(row, "character-image"));
    button.addEventListener("click", () => openEquipment(row));
    characterCell.appendChild(button);

    const occurrence = document.createElement("td");
    occurrence.className = "number-cell";
    occurrence.textContent = language === "ja" ? `${formatNumber(row.occurrence_count)}体` : formatNumber(row.occurrence_count);
    const players = document.createElement("td");
    players.className = "number-cell";
    players.textContent = language === "ja" ? `${formatNumber(row.player_count)}人` : formatNumber(row.player_count);
    const rate = document.createElement("td");
    rate.className = "rate-cell";
    const rateWrap = document.createElement("div");
    rateWrap.className = "rate-value-wrap";
    const rateValue = document.createElement("span");
    rateValue.className = "rate-value";
    rateValue.textContent = `${Number(row.adoption_rate).toFixed(1)}%`;
    const track = document.createElement("span");
    track.className = "rate-track";
    const bar = document.createElement("span");
    bar.className = "rate-bar";
    bar.style.width = `${Math.max(0, Math.min(100, Number(row.adoption_rate)))}%`;
    track.appendChild(bar);
    rateWrap.append(rateValue, track);
    rate.appendChild(rateWrap);
    tr.append(rankCell, characterCell, occurrence, players, rate);
    body.appendChild(tr);
  }
  $("result-count").textContent = t.result(data.characters.length);
}

function equipmentRow(item) {
  const tr = document.createElement("tr");
  const rank = document.createElement("td");
  rank.className = "rank-cell equipment-rank-cell";
  rank.textContent = String(item.rank || "-");
  const icon = document.createElement("td");
  icon.className = "equipment-icon-cell";
  if (trustedImage(item.image, item.item_code, true)) {
    const img = document.createElement("img");
    img.className = "equipment-image";
    img.src = item.image;
    img.alt = text().equipment;
    img.width = 36;
    img.height = 36;
    img.loading = "lazy";
    icon.appendChild(img);
  }
  const count = document.createElement("td");
  count.className = "number-cell";
  count.textContent = formatNumber(item.occurrence_count);
  const players = document.createElement("td");
  players.className = "number-cell";
  players.textContent = formatNumber(item.player_count);
  const rate = document.createElement("td");
  rate.className = "number-cell";
  rate.textContent = `${Number(item.adoption_rate || 0).toFixed(1)}%`;
  tr.append(rank, icon, count, players, rate);
  return tr;
}

function renderEquipment() {
  if (!selectedCharacter) return;
  const t = text();
  $("equipment-title").textContent = t.dialog;
  $("equipment-close").setAttribute("aria-label", t.close);
  const content = $("equipment-content");
  content.replaceChildren();
  const summary = document.createElement("div");
  summary.className = "equipment-summary";
  summary.appendChild(imageFor(selectedCharacter, "equipment-character-image"));
  const copy = document.createElement("div");
  const description = document.createElement("p");
  description.textContent = t.dialogDesc;
  const meta = document.createElement("p");
  meta.className = "equipment-meta";
  meta.textContent = `${selectedCharacter.name} · ${t.players}: ${formatNumber(selectedCharacter.player_count)} · ${t.occ}: ${formatNumber(selectedCharacter.occurrence_count)}`;
  copy.append(description, meta);
  summary.appendChild(copy);
  content.appendChild(summary);

  const tabs = document.createElement("div");
  tabs.className = "equipment-tabs";
  tabs.setAttribute("role", "tablist");
  [["WEAPON",t.weapon],["ARMOR",t.armor],["ACC",t.acc]].forEach(([key,label]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "equipment-tab";
    button.textContent = label;
    button.setAttribute("aria-selected", String(key === selectedEquipment));
    button.addEventListener("click", () => { selectedEquipment = key; renderEquipment(); });
    tabs.appendChild(button);
  });
  content.appendChild(tabs);

  const items = selectedCharacter.equipment_rankings?.[selectedEquipment]?.items;
  if (!Array.isArray(items) || items.length === 0) {
    const empty = document.createElement("p");
    empty.className = "equipment-empty";
    empty.textContent = t.none;
    content.appendChild(empty);
    return;
  }
  const wrapper = document.createElement("div");
  wrapper.className = "equipment-table-wrapper";
  const table = document.createElement("table");
  table.className = "equipment-table";
  const thead = document.createElement("thead");
  const head = document.createElement("tr");
  [t.rank,t.equipment,t.equipmentCount,t.equipmentPlayers,t.rate].forEach(label => { const th=document.createElement("th"); th.scope="col"; th.textContent=label; head.appendChild(th); });
  thead.appendChild(head);
  const tbody = document.createElement("tbody");
  items.forEach(item => tbody.appendChild(equipmentRow(item)));
  table.append(thead, tbody);
  wrapper.appendChild(table);
  content.appendChild(wrapper);
}

function openEquipment(row) {
  selectedCharacter = row;
  selectedEquipment = "WEAPON";
  renderEquipment();
  const dialog = $("equipment-dialog");
  if (!dialog.open) dialog.showModal();
}

async function loadData({quiet=false}={}) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    const response = await fetch(`${DATA_PATH}?v=${Date.now()}`, {cache:"no-store",headers:{Accept:"application/json"},signal:controller.signal});
    clearTimeout(timer);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const raw = await response.text();
    if (raw.length > 4 * 1024 * 1024) throw new Error("payload too large");
    const payload = JSON.parse(raw);
    if (!validate(payload)) throw new Error("invalid verified snapshot");
    data = payload;
    render();
    $("source-status-notice").hidden = true;
  } catch (error) {
    console.error("PvP data load failed", error?.message || "Error");
    if (!data && !quiet) {
      $("status-message").hidden = false;
      $("status-message").className = "message message-error";
      $("status-message").textContent = text().loadError;
    }
  }
}

function detectLanguage() {
  let saved = null;
  try { saved = localStorage.getItem("line-rangers-language"); } catch {}
  if (LABELS[saved]) return saved;
  const browser = String(navigator.language || "").toLowerCase();
  for (const key of ["ja","th","zh","id","vi","ko"]) if (browser.startsWith(key)) return key;
  return "en";
}

language = detectLanguage();
applyLanguage();
$("rank-period-trigger").addEventListener("click", () => {
  const options = $("rank-period-options");
  options.hidden = !options.hidden;
  $("rank-period-trigger").setAttribute("aria-expanded", String(!options.hidden));
});
document.querySelectorAll("[data-rank-period]").forEach(button => button.addEventListener("click", () => {
  if (!PERIODS.includes(button.dataset.rankPeriod)) return;
  period = button.dataset.rankPeriod;
  $("rank-period-options").hidden = true;
  $("rank-period-trigger").setAttribute("aria-expanded", "false");
  applyLanguage();
}));
document.querySelectorAll("[data-language]").forEach(button => button.addEventListener("click", () => {
  if (!LABELS[button.dataset.language]) return;
  language = button.dataset.language;
  try { localStorage.setItem("line-rangers-language", language); } catch {}
  applyLanguage();
}));
$("equipment-close").addEventListener("click", () => $("equipment-dialog").close());
$("equipment-dialog").addEventListener("click", event => { if (event.target === $("equipment-dialog")) $("equipment-dialog").close(); });
document.addEventListener("click", event => { if (!$("rank-period-selector").contains(event.target)) { $("rank-period-options").hidden = true; $("rank-period-trigger").setAttribute("aria-expanded", "false"); } });
loadData();
setInterval(() => loadData({quiet:true}), AUTO_REFRESH_MS);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") loadData({quiet:true}); });
