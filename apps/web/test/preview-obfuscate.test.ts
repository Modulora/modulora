import { describe, expect, it } from "vitest";

import { obfuscatePreviewFiles, requiresCompiledPreview } from "../src/lib/preview-obfuscate";

const component = `// secret implementation notes
import { useState } from "react";

interface CounterProps {
  initialCount: number;
}

export function Counter({ initialCount }: CounterProps) {
  const [carefullyNamedCount, setCarefullyNamedCount] = useState(initialCount);
  return <button onClick={() => setCarefullyNamedCount(carefullyNamedCount + 1)}>{carefullyNamedCount}</button>;
}
`;

describe("preview obfuscation", () => {
  it("compiles external paid and unentitled hosted components", () => {
    const paidExternalComponent = { sourceModel: "external-commercial", entitled: true };
    const unpaidHostedComponent = { sourceModel: "open-source", entitled: false };
    const freeComponent = { sourceModel: "open-source", entitled: true };

    expect(requiresCompiledPreview(paidExternalComponent.sourceModel, paidExternalComponent.entitled)).toBe(true);
    expect(requiresCompiledPreview(unpaidHostedComponent.sourceModel, unpaidHostedComponent.entitled)).toBe(true);
    expect(requiresCompiledPreview(freeComponent.sourceModel, freeComponent.entitled)).toBe(false);
  });

  it("destroys comments, types, and local names while preserving the module contract", async () => {
    const result = await obfuscatePreviewFiles([
      { path: "components/ui/counter.tsx", content: component },
      { path: "styles.css", content: ".counter { color: red; }" },
    ]);
    expect(result).not.toBeNull();
    const [compiled, css] = result!;
    expect(compiled!.content).toContain("Modulora preview build");
    expect(compiled!.content).toContain("export");
    expect(compiled!.content).toContain("Counter");
    expect(compiled!.content).not.toContain("secret implementation notes");
    expect(compiled!.content).not.toContain("CounterProps");
    expect(compiled!.content).not.toContain("carefullyNamedCount");
    expect(css!.content).toBe(".counter { color: red; }");
  });

  it("fails closed when a file cannot be compiled", async () => {
    const result = await obfuscatePreviewFiles([
      { path: "components/ui/broken.tsx", content: "export function (((" },
    ]);
    expect(result).toBeNull();
  });

  it("does not transform an already compiled paid preview again", async () => {
    const first = await obfuscatePreviewFiles([{ path: "component.tsx", content: component }]);
    const second = await obfuscatePreviewFiles(first!);
    expect(second).toEqual(first);
  });
});
