const PAGE_COUNT = 21;
const PAGE_WIDTH = 1684;
const PAGE_HEIGHT = 1191;
const projects = [
  { page: 4, start: 4, end: 7 },
  { page: 8, start: 8, end: 13 },
  { page: 14, start: 14, end: 17 },
  { page: 18, start: 18, end: 19 },
  { page: 20, start: 20, end: 21 },
];

const overlay = document.querySelector("#portfolio-overlay");
const reader = document.querySelector("#portfolio-reader");
const pagesContainer = document.querySelector("#portfolio-pages");
const stage = document.querySelector(".portfolio-stage");
const loadingMessage = document.querySelector(".portfolio-loading");
const openButton = document.querySelector("[data-open-portfolio]");
const projectLinks = [...document.querySelectorAll("[data-project-index]")];
const moreWorksLink = document.querySelector("[data-more-works]");
const closeButton = document.querySelector("[data-close-portfolio]");
const previousButton = document.querySelector("[data-previous-project]");
const nextButton = document.querySelector("[data-next-project]");
const pageLabel = document.querySelector("#current-page-label");

let currentPage = 1;
let lastFocusedElement = null;
let hasLoadedAnyPage = false;
let scrollFrame = null;
let loadFallback = null;
let pageElements = [];

function pageImagePath(page) {
  return `./assets/portfolio${page}.jpg`;
}

function projectIndexForPage(page) {
  return projects.findIndex(
    (project) => page >= project.start && page <= project.end,
  );
}

function updateControls() {
  const projectIndex = projectIndexForPage(currentPage);
  if (previousButton) previousButton.disabled = projectIndex === 0;
  if (nextButton) nextButton.disabled = projectIndex === projects.length - 1;
  if (pageLabel) pageLabel.textContent = `第 ${currentPage} / ${PAGE_COUNT} 页`;
}

function completeLoading() {
  hasLoadedAnyPage = true;
  window.clearTimeout(loadFallback);
  stage?.classList.add("is-loaded");
}

function showLoadError(error, page) {
  console.error(error);
  if (loadingMessage && page === 1) {
    loadingMessage.textContent = "图片加载失败，请检查网络后重试。";
  }
}

function createPages() {
  if (!pagesContainer) return;

  const fragment = document.createDocumentFragment();
  pageElements = [];

  for (let page = 1; page <= PAGE_COUNT; page += 1) {
    const pageElement = document.createElement("section");
    pageElement.className = "portfolio-page";
    pageElement.dataset.page = String(page);
    pageElement.setAttribute("aria-label", `作品集第 ${page} 页`);

    const image = document.createElement("img");
    image.src = pageImagePath(page);
    image.alt = `朱欣彦作品集第 ${page} 页`;
    image.draggable = false;
    image.setAttribute("draggable", "false");
    image.width = PAGE_WIDTH;
    image.height = PAGE_HEIGHT;
    image.decoding = "async";
    image.loading = page === 1 ? "eager" : "lazy";

    if (page === 1) {
      image.fetchPriority = "high";
    }

    image.addEventListener(
      "load",
      () => {
        if (page === 1) completeLoading();
      },
      { once: true },
    );

    image.addEventListener(
      "error",
      () => {
        pageElement.classList.add("has-error");
        showLoadError(new Error(`Failed to load portfolio page ${page}`), page);
      },
      { once: true },
    );

    pageElement.append(image);
    fragment.append(pageElement);
    pageElements.push(pageElement);
  }

  pagesContainer.replaceChildren(fragment);
}

function pageTopWithinReader(pageElement) {
  return (
    pageElement.getBoundingClientRect().top -
    reader.getBoundingClientRect().top +
    reader.scrollTop
  );
}

function scrollToPage(page, behavior = "auto") {
  const normalized = Math.min(PAGE_COUNT, Math.max(1, page));
  const target = pageElements[normalized - 1];
  if (!target || !reader) return;

  currentPage = normalized;
  updateControls();
  reader.scrollTo({
    top: Math.max(0, pageTopWithinReader(target) - 10),
    behavior,
  });
}

function openViewer(projectIndex = -1) {
  if (!overlay) return;

  lastFocusedElement = document.activeElement;
  document.body.classList.add("portfolio-open");
  overlay.removeAttribute("inert");
  overlay.setAttribute("aria-hidden", "false");
  overlay.classList.add("is-open");
  openButton?.setAttribute("aria-expanded", "true");

  if (!hasLoadedAnyPage) {
    window.clearTimeout(loadFallback);
    loadFallback = window.setTimeout(completeLoading, 4000);
  }

  const page = projectIndex >= 0 ? projects[projectIndex].page : 1;
  window.requestAnimationFrame(() => {
    scrollToPage(page);
    closeButton?.focus({ preventScroll: true });
  });
}

function closeViewer() {
  if (!overlay) return;

  overlay.classList.remove("is-open");
  overlay.setAttribute("aria-hidden", "true");
  overlay.setAttribute("inert", "");
  openButton?.setAttribute("aria-expanded", "false");
  document.body.classList.remove("portfolio-open");

  if (lastFocusedElement instanceof HTMLElement) {
    lastFocusedElement.focus({ preventScroll: true });
  }
}

function updatePageFromScroll() {
  if (!reader || !pageElements.length) return;

  const anchor = reader.getBoundingClientRect().top + reader.clientHeight * 0.2;
  let visiblePage = 1;

  for (const pageElement of pageElements) {
    if (pageElement.getBoundingClientRect().top <= anchor) {
      visiblePage = Number(pageElement.dataset.page);
    } else {
      break;
    }
  }

  if (visiblePage !== currentPage) {
    currentPage = visiblePage;
    updateControls();
  }
}

createPages();
updateControls();

openButton?.addEventListener("click", (event) => {
  event.preventDefault();
  openViewer();
});

projectLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    const index = Number(link.dataset.projectIndex);
    openViewer(Number.isInteger(index) ? index : -1);
  });
});

moreWorksLink?.addEventListener("click", (event) => {
  event.preventDefault();
  openViewer(4);
});

previousButton?.addEventListener("click", () => {
  const projectIndex = projectIndexForPage(currentPage);
  if (projectIndex > 0) {
    scrollToPage(projects[projectIndex - 1].page);
  }
});

nextButton?.addEventListener("click", () => {
  const projectIndex = projectIndexForPage(currentPage);
  const nextIndex = projectIndex < 0 ? 0 : projectIndex + 1;
  if (nextIndex < projects.length) {
    scrollToPage(projects[nextIndex].page);
  }
});

closeButton?.addEventListener("click", closeViewer);

reader?.addEventListener(
  "scroll",
  () => {
    if (scrollFrame) return;
    scrollFrame = window.requestAnimationFrame(() => {
      scrollFrame = null;
      updatePageFromScroll();
    });
  },
  { passive: true },
);

pagesContainer?.addEventListener("contextmenu", (event) => {
  if (event.target.closest(".portfolio-page")) {
    event.preventDefault();
  }
});

document.addEventListener("keydown", (event) => {
  if (!overlay?.classList.contains("is-open")) return;

  if (event.key === "Escape") closeViewer();
  if (event.key === "ArrowLeft") previousButton?.click();
  if (event.key === "ArrowRight") nextButton?.click();
});
