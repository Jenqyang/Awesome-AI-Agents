const CATEGORIES = [
  "All",
  "Applications",
  "Frameworks",
  "Tools",
  "Benchmarks",
  "Platforms",
  "Research",
];
const PAGE_SIZE = 24;
const GITHUB_STARS_CACHE_KEY = "awesome-ai-agents:github-stars";

const state = {
  resources: [],
  query: "",
  category: "All",
  visible: PAGE_SIZE,
};

const elements = {
  categories: document.querySelector("#categories"),
  count: document.querySelector("#results-count"),
  empty: document.querySelector("#empty-state"),
  list: document.querySelector("#resources"),
  loadMore: document.querySelector("#load-more"),
  reset: document.querySelector("#reset-button"),
  search: document.querySelector("#search-input"),
  githubLink: document.querySelector(".github-link"),
  githubStars: document.querySelector("#github-stars-count"),
};

const externalIcon = `
  <span class="icon icon-external-link" aria-hidden="true"></span>
`;

const initialsFor = (name) => {
  const words = name.match(/[A-Za-z0-9]+/g) || [name];
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
};

const normalized = (value) => value.trim().toLocaleLowerCase();

const renderGitHubStars = (count) => {
  const exactCount = new Intl.NumberFormat("en-US").format(count);
  const compactCount =
    count >= 1000
      ? `${new Intl.NumberFormat("en-US", {
          maximumFractionDigits: 1,
        }).format(Math.floor(count / 100) / 10)}k+`
      : exactCount;

  elements.githubStars.textContent = compactCount;
  elements.githubLink.setAttribute(
    "aria-label",
    `Star on GitHub, ${exactCount} stars`,
  );
  elements.githubLink.title = `${exactCount} GitHub stars`;
};

const updateGitHubStars = async () => {
  try {
    const cached = JSON.parse(localStorage.getItem(GITHUB_STARS_CACHE_KEY));
    if (Number.isInteger(cached?.count)) renderGitHubStars(cached.count);
  } catch {
    localStorage.removeItem(GITHUB_STARS_CACHE_KEY);
  }

  try {
    const repository = elements.githubLink.dataset.repository;
    const response = await fetch(`https://api.github.com/repos/${repository}`, {
      cache: "no-store",
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    if (!Number.isInteger(data.stargazers_count)) {
      throw new Error("GitHub response did not include a star count");
    }

    renderGitHubStars(data.stargazers_count);
    localStorage.setItem(
      GITHUB_STARS_CACHE_KEY,
      JSON.stringify({ count: data.stargazers_count }),
    );
  } catch (error) {
    console.warn("Unable to refresh GitHub stars:", error);
  }
};

const filteredResources = () => {
  const query = normalized(state.query);

  return state.resources.filter((resource) => {
    const matchesCategory =
      state.category === "All" || resource.category === state.category;
    if (!matchesCategory) return false;
    if (!query) return true;

    return normalized(
      `${resource.name} ${resource.description} ${resource.category} ${resource.section}`,
    ).includes(query);
  });
};

const updateUrl = () => {
  const url = new URL(window.location.href);
  state.query ? url.searchParams.set("q", state.query) : url.searchParams.delete("q");
  state.category !== "All"
    ? url.searchParams.set("category", state.category)
    : url.searchParams.delete("category");
  window.history.replaceState({}, "", url);
};

const renderCategories = () => {
  elements.categories.replaceChildren(
    ...CATEGORIES.map((category) => {
      const button = document.createElement("button");
      button.className = "category-button";
      button.type = "button";
      button.textContent = category;
      button.setAttribute("aria-pressed", String(category === state.category));
      button.addEventListener("click", () => {
        state.category = category;
        state.visible = PAGE_SIZE;
        render();
      });
      return button;
    }),
  );
};

const resourceRow = (resource) => {
  const link = document.createElement("a");
  link.className = "resource-row";
  link.href = resource.url;
  link.target = "_blank";
  link.rel = "noreferrer";
  link.setAttribute("aria-label", `${resource.name} — opens in a new tab`);

  const avatar = document.createElement("span");
  avatar.className = "resource-avatar";
  avatar.setAttribute("aria-hidden", "true");

  const avatarFallback = document.createElement("span");
  avatarFallback.className = "resource-avatar-fallback";
  avatarFallback.textContent = initialsFor(resource.name);
  avatar.append(avatarFallback);

  if (resource.icon?.url) {
    const avatarImage = document.createElement("img");
    avatarImage.className = "resource-avatar-image";
    avatarImage.src = resource.icon.url;
    avatarImage.alt = "";
    avatarImage.width = 52;
    avatarImage.height = 52;
    avatarImage.loading = "lazy";
    avatarImage.decoding = "async";
    avatar.dataset.iconType = resource.icon.type;
    avatarImage.addEventListener("load", () => {
      avatar.classList.add("has-image");
    });
    avatarImage.addEventListener("error", () => {
      avatarImage.remove();
    });
    avatar.prepend(avatarImage);
  }

  const copy = document.createElement("span");
  copy.className = "resource-copy";
  const name = document.createElement("h3");
  name.textContent = resource.name;
  const description = document.createElement("p");
  description.textContent = resource.description;
  copy.append(name, description);

  const category = document.createElement("span");
  category.className = "resource-category";
  category.textContent = resource.category;

  const source = document.createElement("span");
  source.className = "resource-source";
  const sourceText = document.createElement("span");
  sourceText.className = "resource-source-label";
  sourceText.textContent = resource.source;
  source.append(sourceText);
  source.insertAdjacentHTML("beforeend", externalIcon);

  link.append(avatar, copy, category, source);
  return link;
};

const render = () => {
  const filtered = filteredResources();
  const visibleResources = filtered.slice(0, state.visible);

  renderCategories();
  elements.list.replaceChildren(...visibleResources.map(resourceRow));
  elements.count.textContent = `${filtered.length} ${filtered.length === 1 ? "resource" : "resources"}`;
  elements.empty.hidden = filtered.length !== 0;
  elements.list.hidden = filtered.length === 0;
  elements.loadMore.hidden = state.visible >= filtered.length;
  updateUrl();
};

elements.search.addEventListener("input", (event) => {
  state.query = event.target.value;
  state.visible = PAGE_SIZE;
  render();
});

elements.loadMore.addEventListener("click", () => {
  state.visible += PAGE_SIZE;
  render();
});

elements.reset.addEventListener("click", () => {
  state.query = "";
  state.category = "All";
  state.visible = PAGE_SIZE;
  elements.search.value = "";
  elements.search.focus();
  render();
});

document.addEventListener("keydown", (event) => {
  const isTyping = ["INPUT", "TEXTAREA"].includes(document.activeElement.tagName);
  if (event.key === "/" && !isTyping) {
    event.preventDefault();
    elements.search.focus();
  }
});

const initialize = async () => {
  try {
    const response = await fetch("./resources.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    state.resources = await response.json();

    const params = new URLSearchParams(window.location.search);
    const requestedCategory = params.get("category");
    state.query = params.get("q") || "";
    state.category = CATEGORIES.includes(requestedCategory)
      ? requestedCategory
      : "All";
    elements.search.value = state.query;
    render();
  } catch (error) {
    console.error("Unable to load resources:", error);
    elements.count.textContent = "Unable to load resources";
    elements.empty.hidden = false;
    elements.empty.querySelector("h3").textContent = "Resources are unavailable";
    elements.empty.querySelector("p").textContent =
      "Please refresh the page or try again in a moment.";
    elements.reset.hidden = true;
  }
};

updateGitHubStars();
initialize();
