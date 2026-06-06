import { describe, expect, it } from "vitest";
import { buildPublicAssetPath, normalizeBasePath } from "./base-path";

describe("normalizeBasePath", () => {
  it("keeps local builds rooted at slash", () => {
    expect(normalizeBasePath(undefined)).toBe("/");
    expect(normalizeBasePath("")).toBe("/");
  });

  it("normalizes repository subpaths for GitHub Pages", () => {
    expect(normalizeBasePath("agent-alibi")).toBe("/agent-alibi/");
    expect(normalizeBasePath("/agent-alibi")).toBe("/agent-alibi/");
    expect(normalizeBasePath("/agent-alibi/")).toBe("/agent-alibi/");
  });
});

describe("buildPublicAssetPath", () => {
  it("resolves public assets against the configured Vite base", () => {
    expect(buildPublicAssetPath("/agent-alibi/", "audio/music_stealth_loop.mp3")).toBe("/agent-alibi/audio/music_stealth_loop.mp3");
    expect(buildPublicAssetPath("/", "audio/music_stealth_loop.mp3")).toBe("/audio/music_stealth_loop.mp3");
  });
});
