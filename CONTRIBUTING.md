# Contributing to Awesome-AI-Agents

Thanks for helping improve this list.

## Scope

This repository curates high-quality resources for AI agents, including:

- Applications
- Frameworks
- Tools
- Benchmark/Evaluator
- Platforms/API
- Related resources (Survey, Paper-List Repo, Blog, Reference Repo)

## Quality Bar

We prioritize quality over quantity.

- Open-source first: OSS projects are preferred.
- OSS substance over OSS wrapper: an open-source MCP/server/client wrapper is not enough if the core product value depends mainly on a proprietary hosted service or paid backend.
- Real ecosystem value: the project should materially help the agent ecosystem.
- Evidence over marketing: avoid hype-heavy or ad-like wording.
- Maintainability signals: active repo, clear docs, usable code/artifacts.
- No duplicates: check existing entries before submitting.

Submissions may be closed if they are mostly promotional, out of scope, weakly documented, duplicate existing entries, or function mainly as marketing for a paid service.

## Before You Submit

1. Search the README to ensure the item is not already listed.
2. Confirm the best section for your item.
3. Ensure the project has a complete README (at least install/usage context).
4. Prepare a neutral one-line description.
5. If the project connects to a paid API/service, explain what meaningful value remains usable from the open-source artifact itself.

## Preferred Contribution Path

Open a PR directly when possible.

- One entry per PR is preferred.
- Keep changes minimal and focused.
- Put the entry in the most appropriate section.
- Keep list style consistent with existing lines.

Entry format:

```md
- [ProjectName](https://github.com/org/repo) - Neutral one-line description. ![GitHub Repo stars](https://img.shields.io/github/stars/org/repo?style=social)
```

For non-GitHub resources (paper/blog/website), use the existing section style.

## PR Review Expectations

Reviewers typically check:

- Scope fit and section fit
- Duplicate risk
- Open-source status and license clarity
- Whether the OSS artifact is independently useful, or just a thin gateway to a paid hosted product
- README quality and practical usefulness
- Neutral language (no unverifiable claims like "best"/"first" unless clearly verifiable)

## Commercial Service Boundary

The list is curated with an OSS-first bias, not a "has a public repo" bias.

- A public repo does not qualify by itself if the main user value depends on a paid or closed hosted service.
- Open-source adapters for commercial APIs/services are reviewed more strictly because they often function as distribution for the paid service.
- These submissions must show clear standalone OSS value, such as meaningful self-hosted functionality, reusable local components, or documentation/examples that remain practically useful without buying the hosted product.
- "Free tier", "no API key", pricing, credits, or upgrade paths should not be part of the proposed entry line and may be treated as advertising signals.
- If the commercial dependency is central and the OSS layer is only a thin connector, the submission may be closed even when the repo license is valid.

## Fast Rework Tips

If your PR is not merged, the fastest way to unblock is:

1. Remove promotional language.
2. Provide concrete technical value in one line.
3. Fix section placement and formatting.
4. If the project depends on a commercial backend, explain the standalone OSS value clearly.
5. Resubmit with only the necessary change.

Thanks again for contributing.
