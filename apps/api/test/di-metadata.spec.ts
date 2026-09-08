import "reflect-metadata";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { PermissionsGuard } from "../src/common/permissions.guard.js";
import { ModelRouterService } from "../src/modules/ai/model-router.service.js";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const readJsonc = (relativePath: string): Record<string, unknown> => {
  const raw = readFileSync(resolve(packageRoot, relativePath), "utf8");
  return JSON.parse(raw.replace(/^\s*\/\/.*$/gm, "")) as Record<string, unknown>;
};

/**
 * Regression guard for the DI outage caused by a transpiler that strips
 * `design:paramtypes`. When metadata is missing, Nest constructs every provider
 * with zero arguments and each request fails with an undefined-dependency
 * TypeError instead of a build error, so it must be asserted explicitly.
 */
describe("dependency injection metadata", () => {
  it("emits constructor parameter metadata for injectable classes", () => {
    expect(Reflect.getMetadata("design:paramtypes", PermissionsGuard)).toBeDefined();
    expect(Reflect.getMetadata("design:paramtypes", ModelRouterService)).toBeDefined();
  });

  it("keeps emitDecoratorMetadata enabled in the API tsconfig", () => {
    const tsconfig = readJsonc("tsconfig.json");
    const compilerOptions = tsconfig.compilerOptions as Record<string, unknown>;
    expect(compilerOptions.emitDecoratorMetadata).toBe(true);
    expect(compilerOptions.experimentalDecorators).toBe(true);
  });

  it("runs the API through tsc rather than a metadata-stripping transpiler", () => {
    const pkg = readJsonc("package.json");
    const scripts = pkg.scripts as Record<string, string>;

    expect(scripts.build).toContain("tsc");
    expect(scripts.dev).toContain("tsc");
    for (const script of [scripts.build, scripts.dev, scripts["start:dev"], scripts.start]) {
      expect(script ?? "").not.toMatch(/\btsx\b/);
      expect(script ?? "").not.toMatch(/\besbuild\b/);
    }
  });
});
