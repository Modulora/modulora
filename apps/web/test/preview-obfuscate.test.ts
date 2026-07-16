import { describe, expect, it } from "vitest";

import { obfuscatePreviewFiles } from "../src/lib/preview-obfuscate";

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
});
