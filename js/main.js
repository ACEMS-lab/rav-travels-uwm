/* =====================================================
   main.js  -  reads the files in content/ and builds the page
   You normally do NOT need to edit this file to change text or links.
   Edit the JSON files in content/ instead.
   ===================================================== */

const CONTENT_DIR = "content/";

/* ---------- Helpers ---------- */

// Makes text safe to put inside HTML (so a "<" in your text cannot break the page)
function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

// Downloads one JSON file from content/ and turns it into a JavaScript object
async function loadJSON(name) {
  const response = await fetch(CONTENT_DIR + name + ".json");
  if (!response.ok) throw new Error(name + ".json could not be loaded (status " + response.status + ")");
  return response.json();
}

// Links that start with http open in a new tab; "#section" links stay on the page
function linkAttrs(href) {
  return /^https?:/i.test(href) ? ' target="_blank" rel="noopener"' : "";
}

// The empty box inside a section (see data-fill in index.html)
function box(sectionId) {
  return document.querySelector("#" + sectionId + " [data-fill]");
}

/* ---------- Section builders: one per content file ---------- */

function renderSite(site) {
  if (site.pageTitle) document.title = site.pageTitle;

  // Header brand: logo image if you set one, otherwise the text name
  const logo = site.brand.logo
    ? '<img class="brand-logo" src="' + esc(site.brand.logo) + '" alt="' + esc(site.brand.name) + ' logo">'
    : '<span class="brand-mark">' + esc(site.brand.name) + "</span>";
  document.getElementById("brand").innerHTML =
    logo + '<span class="brand-sub">' + esc(site.brand.subtitle) + "</span>";

  // Navigation links
  document.getElementById("siteNav").innerHTML = site.nav
    .map(item => '<a href="#' + esc(item.target) + '">' + esc(item.label) + "</a>")
    .join("");

  // Hero (big title area)
  const h = site.hero;
  box("hero").innerHTML =
    '<p class="eyebrow">' + esc(h.eyebrow) + "</p>" +
    "<h1>" + esc(h.title) + "</h1>" +
    '<p class="lead">' + esc(h.lead) + "</p>" +
    '<div class="button-row">' +
      h.buttons.map(b =>
        '<a class="btn btn-' + esc(b.style) + '" href="' + esc(b.href) + '"' + linkAttrs(b.href) + ">" + esc(b.label) + "</a>"
      ).join("") +
    "</div>";

  // Footer
  const f = site.footer;
  document.getElementById("footerContent").innerHTML =
    "<p>" + esc(f.before) +
    '<a href="' + esc(f.linkUrl) + '" target="_blank" rel="noopener">' + esc(f.linkLabel) + "</a>" +
    esc(f.after) + "</p>" +
    '<p class="small">© ' + new Date().getFullYear() + " " + esc(f.copyright) + "</p>";
}

function renderAbout(about) {
  box("about").innerHTML =
    "<h2>" + esc(about.title) + "</h2>" +
    about.paragraphs.map(p => "<p>" + esc(p) + "</p>").join("") +
    '<div class="grid two">' +
      about.tasks.map(t =>
        '<article class="card"><h3>' + esc(t.title) + "</h3><p>" + esc(t.text) + "</p></article>"
      ).join("") +
    "</div>";
}

function renderServices(services) {
  box("services").innerHTML =
    "<h2>" + esc(services.title) + "</h2>" +
    "<p>" + esc(services.intro) + "</p>" +
    '<div class="grid four">' +
      services.items.map(s =>
        '<article class="card"><h3>' + esc(s.name) + "</h3><p>" + esc(s.text) + "</p></article>"
      ).join("") +
    "</div>";
}

function renderSurveys(cfg) {
  box("survey").innerHTML =
    "<h2>" + esc(cfg.title) + "</h2>" +
    "<p>" + esc(cfg.intro) + (cfg.consentNote ? " <strong>" + esc(cfg.consentNote) + "</strong>" : "") + "</p>" +
    '<div class="survey-tabs" role="tablist" aria-label="Choose your survey">' +
      cfg.tabs.map(t =>
        '<button type="button" role="tab" class="survey-tab" id="tab-' + esc(t.key) + '" data-survey="' +
        esc(t.key) + '" aria-selected="false" aria-controls="surveyBox">' + esc(t.label) + "</button>"
      ).join("") +
    "</div>" +
    '<p id="surveyDescription" class="small survey-description"></p>' +
    '<div id="surveyBox" class="survey-box" role="tabpanel" aria-live="polite"></div>' +
    '<p class="small">' + esc(cfg.fallbackText) +
    ' <a id="surveyFallback" href="#" target="_blank" rel="noopener">' + esc(cfg.fallbackLinkLabel) + "</a>.</p>";

  const surveyBox = document.getElementById("surveyBox");
  const fallback = document.getElementById("surveyFallback");
  const description = document.getElementById("surveyDescription");
  const tabs = Array.from(document.querySelectorAll(".survey-tab"));

  // Only the SELECTED survey is loaded into an <iframe>; the other is not opened at all.
  function show(key) {
    const survey = cfg.tabs.find(t => t.key === key);
    if (!survey) return;
    tabs.forEach(tab => {
      const active = tab.dataset.survey === key;
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    description.textContent = survey.description || "";
    surveyBox.setAttribute("aria-labelledby", "tab-" + key);

    if (!survey.url) {
      surveyBox.innerHTML = '<div class="survey-message">' + esc(cfg.comingSoon) + "</div>";
      fallback.removeAttribute("href");
      return;
    }
    const frame = document.createElement("iframe");
    frame.src = survey.url;
    frame.title = survey.label + " survey";
    surveyBox.innerHTML = "";
    surveyBox.appendChild(frame);
    fallback.href = survey.url;
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => show(tab.dataset.survey));
    tab.addEventListener("keydown", event => {   // Left/Right arrows move between tabs
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      const step = event.key === "ArrowRight" ? 1 : tabs.length - 1;
      const next = tabs[(i + step) % tabs.length];
      next.focus();
      show(next.dataset.survey);
    });
  });

  show(cfg.defaultTab || (cfg.tabs[0] && cfg.tabs[0].key));
}

function renderResults(results) {
  const items = results.items || [];
  box("results").innerHTML =
    "<h2>" + esc(results.title) + "</h2>" +
    (items.length === 0
      ? '<div class="placeholder">' + esc(results.emptyMessage) + "</div>"
      : '<div class="grid two">' + items.map(item =>
          "<figure class=\"result\">" +
            '<img src="' + esc(item.image) + '" alt="' + esc(item.alt) + '">' +
            "<figcaption><strong>" + esc(item.title) + "</strong><br>" + esc(item.caption) + "</figcaption>" +
          "</figure>"
        ).join("") + "</div>");
}

function renderTeam(team) {
  box("team").innerHTML =
    "<h2>" + esc(team.title) + "</h2>" +
    '<div class="grid three">' +
      team.members.map(m =>
        '<article class="card"><h3>' + esc(m.institution) + "</h3>" +
        (m.role ? "<p>" + esc(m.role) + "</p>" : "") +
        m.people.map(p => '<p class="small">' + esc(p) + "</p>").join("") +
        (m.email ? '<p class="small"><a href="mailto:' + esc(m.email) + '">' + esc(m.email) + "</a></p>" : "") +
        "</article>"
      ).join("") +
    "</div>";
}

/* ---------- Page start ---------- */

// Which content file fills which section, and which function builds it
const SECTIONS = [
  { file: "site",     build: renderSite,     sectionId: "hero" },
  { file: "about",    build: renderAbout,    sectionId: "about" },
  { file: "services", build: renderServices, sectionId: "services" },
  { file: "surveys",  build: renderSurveys,  sectionId: "survey" },
  { file: "results",  build: renderResults,  sectionId: "results" },
  { file: "team",     build: renderTeam,     sectionId: "team" }
];

function showWarning(message) {
  const warning = document.getElementById("loadWarning");
  warning.hidden = false;
  warning.textContent = message;
}

// Mobile menu: the Menu button shows/hides the links (links are created by renderSite,
// so we listen on the nav box itself)
function setupMenu() {
  const button = document.getElementById("menuToggle");
  const nav = document.getElementById("siteNav");
  button.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("open");
    button.setAttribute("aria-expanded", String(isOpen));
  });
  nav.addEventListener("click", event => {
    if (event.target.tagName === "A") {
      nav.classList.remove("open");
      button.setAttribute("aria-expanded", "false");
    }
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  setupMenu();

  // Opening index.html by double-click (file://) blocks fetch(); explain instead of showing blanks
  if (location.protocol === "file:") {
    showWarning("This page loads its text from the content/ folder, which browsers block when a file is opened by double-click. " +
      "Run a local server instead: open a terminal in this folder, run  python -m http.server  and visit http://localhost:8000");
    return;
  }

  // Load every content file at once; one failing file does not stop the others
  const results = await Promise.allSettled(SECTIONS.map(s => loadJSON(s.file)));
  results.forEach((result, i) => {
    const section = SECTIONS[i];
    try {
      if (result.status === "rejected") throw result.reason;
      section.build(result.value);
    } catch (error) {
      console.error(error);
      const target = box(section.sectionId);
      if (target) {
        target.innerHTML = '<div class="placeholder">This section could not load (content/' + section.file +
          ".json). Check that file for a typo such as a missing comma or quote.</div>";
      }
      showWarning("Part of the page could not load. Open the browser console (F12) for details.");
    }
  });
});