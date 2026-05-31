/**
 * Regression: in-session thinking-level changes must not bleed into the
 * global settings file. Only callers that pass `{ persist: true }` (currently:
 * `/settings` UI) update `defaultThinkingLevel`.
 */

import { afterEach, describe, expect, it } from "vitest";
import { createHarness, type Harness } from "./harness.ts";

describe("AgentSession does not persist in-session thinking changes by default", () => {
	const harnesses: Harness[] = [];

	afterEach(() => {
		while (harnesses.length > 0) {
			harnesses.pop()?.cleanup();
		}
	});

	it("setThinkingLevel without persist leaves the global thinking level untouched", async () => {
		const harness = await createHarness({
			models: [{ id: "faux-1", name: "One", reasoning: true }],
		});
		harnesses.push(harness);
		const initial = harness.settingsManager.getDefaultThinkingLevel();

		harness.session.setThinkingLevel("high");

		expect(harness.session.thinkingLevel).toBe("high");
		expect(harness.settingsManager.getDefaultThinkingLevel()).toBe(initial);
	});

	it("setThinkingLevel with persist:true updates the global thinking level", async () => {
		const harness = await createHarness({
			models: [{ id: "faux-1", name: "One", reasoning: true }],
		});
		harnesses.push(harness);

		harness.session.setThinkingLevel("high", { persist: true });

		expect(harness.session.thinkingLevel).toBe("high");
		expect(harness.settingsManager.getDefaultThinkingLevel()).toBe("high");
	});

	it("cycleThinkingLevel does not persist by default", async () => {
		const harness = await createHarness({
			models: [{ id: "faux-1", name: "One", reasoning: true }],
		});
		harnesses.push(harness);
		// Establish a known starting in-session level without persisting.
		harness.session.setThinkingLevel("low");
		const initial = harness.settingsManager.getDefaultThinkingLevel();

		const next = harness.session.cycleThinkingLevel();

		expect(next).toBeDefined();
		expect(harness.session.thinkingLevel).toBe(next);
		expect(harness.settingsManager.getDefaultThinkingLevel()).toBe(initial);
	});
});
