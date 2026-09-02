import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const readmePath = path.join(repositoryRoot, "README.md");
const outputPath = path.join(repositoryRoot, "site", "resources.json");
const githubToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const githubApiUrl = process.env.GITHUB_API_URL || "https://api.github.com";
const GITHUB_FETCH_CONCURRENCY = 10;
const MIN_GITHUB_REFRESH_RATIO = 0.8;

const groupForSection = (levelTwo, levelThree) => {
  if (levelThree === "Tools") return "Tools";
  if (levelTwo === "Applications") return "Applications";
  if (levelTwo === "Frameworks") return "Frameworks";
  if (levelTwo === "Benchmark/Evaluator") return "Benchmarks";
  if (levelTwo === "Platforms/API") return "Platforms";
  if (levelTwo === "Related" || levelTwo === "Reference Repo") {
    return "Research";
  }
  return "Other";
};

const iconForUrl = (value) => {
  try {
    const url = new URL(value);
    const pathParts = url.pathname.split("/").filter(Boolean);

    if (url.hostname === "github.com" && pathParts.length >= 2) {
      return {
        url: `https://github.com/${encodeURIComponent(pathParts[0])}.png?size=96`,
        type: "avatar",
      };
    }

    return {
      url: `${url.origin}/favicon.ico`,
      type: "favicon",
    };
  } catch {
    return null;
  }
};

const githubRepositoryForUrl = (value) => {
  try {
    const url = new URL(value);
    const [owner, rawRepository] = url.pathname.split("/").filter(Boolean);

    if (url.hostname !== "github.com" || !owner || !rawRepository) return null;

    const repository = rawRepository.replace(/\.git$/, "");
    return `${owner}/${repository}`;
  } catch {
    return null;
  }
};

const readCachedUpdateTimes = async () => {
  try {
    const cachedResources = JSON.parse(await readFile(outputPath, "utf8"));
    return new Map(
      cachedResources.flatMap((resource) => {
        const repository = githubRepositoryForUrl(resource.url);
        return repository && resource.updatedAt
          ? [[repository.toLowerCase(), resource.updatedAt]]
          : [];
      }),
    );
  } catch {
    return new Map();
  }
};

const fetchGithubUpdateTime = async (repository) => {
  const [owner, name] = repository.split("/");
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "awesome-ai-agents-site-builder",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (githubToken) headers.Authorization = `Bearer ${githubToken}`;

  try {
    const response = await fetch(
      `${githubApiUrl}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`,
      {
        headers,
        signal: AbortSignal.timeout(15_000),
      },
    );

    if (!response.ok) {
      console.warn(
        `Unable to fetch update time for ${repository}: HTTP ${response.status}`,
      );
      return null;
    }

    const data = await response.json();
    return typeof data.pushed_at === "string" ? data.pushed_at : null;
  } catch (error) {
    console.warn(
      `Unable to fetch update time for ${repository}: ${error.message}`,
    );
    return null;
  }
};

const fetchGithubUpdateTimes = async (repositories) => {
  const updateTimes = new Map();
  let nextIndex = 0;

  const worker = async () => {
    while (nextIndex < repositories.length) {
      const repository = repositories[nextIndex];
      nextIndex += 1;
      updateTimes.set(
        repository.toLowerCase(),
        await fetchGithubUpdateTime(repository),
      );
    }
  };

  await Promise.all(
    Array.from(
      { length: Math.min(GITHUB_FETCH_CONCURRENCY, repositories.length) },
      worker,
    ),
  );
  return updateTimes;
};

const decodeEntities = (value) =>
  value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");

const cleanDescription = (value) =>
  decodeEntities(
    value
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
      .replace(/!\[[^\]]*$/g, "")
      .replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, "")
      .replace(/<[^>]+>/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/[`*_]/g, "")
      .replace(/\s+/g, " ")
      .trim(),
  );

const readme = await readFile(readmePath, "utf8");
const resources = [];
let levelTwo = "";
let levelThree = "";
let inResources = false;

for (const line of readme.split("\n")) {
  const secondLevel = line.match(/^##\s+(.+?)\s*$/);
  if (secondLevel) {
    levelTwo = secondLevel[1].trim();
    levelThree = "";
    inResources = true;
    continue;
  }

  const thirdLevel = line.match(/^###\s+(.+?)\s*$/);
  if (thirdLevel) {
    levelThree = thirdLevel[1].trim();
    continue;
  }

  if (!inResources) continue;

  const entry = line.match(
    /^- \[([^\]]+)\]\((https?:\/\/[^)]+)\)\s*(?:[-—]\s*)?(.*)$/,
  );
  if (!entry) continue;

  const [, name, url, rawDescription] = entry;
  const description = cleanDescription(rawDescription);
  const section = levelThree || levelTwo;

  resources.push({
    id: resources.length + 1,
    name: decodeEntities(name.trim()),
    url,
    description: description || "Explore this resource and its documentation.",
    category: groupForSection(levelTwo, levelThree),
    section,
    source: url.includes("github.com") ? "GitHub" : "Website",
    icon: iconForUrl(url),
  });
}

const cachedUpdateTimes = await readCachedUpdateTimes();
const githubRepositoriesByKey = new Map();
for (const { url } of resources) {
  const repository = githubRepositoryForUrl(url);
  if (repository) {
    githubRepositoriesByKey.set(repository.toLowerCase(), repository);
  }
}
const githubRepositories = [...githubRepositoriesByKey.values()];
const fetchedUpdateTimes = githubToken
  ? await fetchGithubUpdateTimes(githubRepositories)
  : new Map();
const refreshedRepositoryCount = [...fetchedUpdateTimes.values()].filter(
  Boolean,
).length;

if (
  githubToken &&
  githubRepositories.length > 0 &&
  refreshedRepositoryCount / githubRepositories.length <
    MIN_GITHUB_REFRESH_RATIO
) {
  throw new Error(
    `Only ${refreshedRepositoryCount} of ${githubRepositories.length} GitHub repositories were refreshed; refusing to publish incomplete ordering.`,
  );
}

if (!githubToken) {
  console.warn(
    "GITHUB_TOKEN or GH_TOKEN is not set; using cached GitHub update times.",
  );
}

for (const resource of resources) {
  const repository = githubRepositoryForUrl(resource.url);
  if (!repository) continue;

  const key = repository.toLowerCase();
  const updatedAt = fetchedUpdateTimes.get(key) || cachedUpdateTimes.get(key);
  if (updatedAt) resource.updatedAt = updatedAt;
}

resources.sort((left, right) => {
  const parsedLeftTimestamp = left.updatedAt ? Date.parse(left.updatedAt) : 0;
  const parsedRightTimestamp = right.updatedAt
    ? Date.parse(right.updatedAt)
    : 0;
  const leftTimestamp = Number.isNaN(parsedLeftTimestamp)
    ? 0
    : parsedLeftTimestamp;
  const rightTimestamp = Number.isNaN(parsedRightTimestamp)
    ? 0
    : parsedRightTimestamp;
  return rightTimestamp - leftTimestamp || left.id - right.id;
});

resources.forEach((resource, index) => {
  resource.id = index + 1;
});

await writeFile(outputPath, `${JSON.stringify(resources, null, 2)}\n`, "utf8");
console.log(
  `Generated ${resources.length} resources (${refreshedRepositoryCount} GitHub repositories refreshed) at ${outputPath}`,
);
