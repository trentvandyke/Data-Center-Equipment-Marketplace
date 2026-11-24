import assert from "node:assert/strict";
import test from "node:test";
import { robotsAllows } from "./http";

test("robots.txt allows listing pages and blocks a named path", () => {
  const robots = `User-agent: *\nDisallow: /api/\nDisallow: /admin\n`;
  assert.equal(robotsAllows(robots, "/listings/2001-transformer/"), true);
  assert.equal(robotsAllows(robots, "/api/search"), false);
  assert.equal(robotsAllows(robots, "/admin"), false);
});
