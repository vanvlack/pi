/**
 * Regression: in-session model/thinking-level changes must not bleed into the
 * global settings file. Only callers that pass `{ persist: true }` (currently:
 * `/settings` UI and the post-auth onboarding flow) update
 * `defaultProvider` / `defaultModel` / `defaultThinkingLevel`.
 */

import { afterEach, describe, expect, it } from "vitest";
import { createHarness, type Harness } from "./harness.ts";

describe("AgentSession does not persist in-session model/thinking changes by default", () => {
	const harnesses: Harness[] = [];

	afterEach(() => {
		while (harnesses.length > 0) {
			harnesses.pop()?.cleanup();
		}
	});

	it("setModel without persist leaves the global default model untouched", async () => {
		const harness = await createHarness({
			models: [
				{ id: "faux-1", name: "One", reasoning: true },
				{ id: "faux-2", name: "Two", reasoning: true },
			],
		});
		harnesses.push(harness);
		// Capture whatever the harness started with (may be undefined if the
		// harness doesn't initialize defaultModel; that's exactly the state we
		// want preserved across an in-session toggle).
		const initialModel = harness.settingsManager.getDefaultModel();
		const initialProvider = harness.settingsManager.getDefaultProvider();

		await harness.session.setModel(harness.getModel("faux-2")!);

		// Session state updates...
		expect(harness.session.model?.id).toBe("faux-2");
		// ...but global settings do not.
		expect(harness.settingsManager.getDefaultModel()).toBe(initialModel);
		expect(harness.settingsManager.getDefaultProvider()).toBe(initialProvider);
	});

	it("setModel with persist:true updates the global default model", async () => {
		const harness = await createHarness({
			models: [
				{ id: "faux-1", name: "One", reasoning: true },
				{ id: "faux-2", name: "Two", reasoning: true },
			],
		});
		harnesses.push(harness);
		const target = harness.getModel("faux-2")!;

		await harness.session.setModel(target, { persist: true });

		expect(harness.settingsManager.getDefaultModel()).toBe(target.id);
		expect(harness.settingsManager.getDefaultProvider()).toBe(target.provider);
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

	it("cycleModel does not persist by default", async () => {
		const harness = await createHarness({
			models: [
				{ id: "faux-1", name: "One", reasoning: true },
				{ id: "faux-2", name: "Two", reasoning: true },
			],
		});
		harnesses.push(harness);
		const initialModel = harness.settingsManager.getDefaultModel();
		const initialProvider = harness.settingsManager.getDefaultProvider();

		await harness.session.cycleModel();

		// The session moved to a different model...
		expect(harness.session.model?.id).not.toBe("faux-1");
		// ...but the global default is unchanged.
		expect(harness.settingsManager.getDefaultModel()).toBe(initialModel);
		expect(harness.settingsManager.getDefaultProvider()).toBe(initialProvider);
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

	it("session transcript still records in-session model/thinking changes", async () => {
		// Resume must keep working after the patch — transcript entries are
		// the per-session source of truth.
		const harness = await createHarness({
			models: [
				{ id: "faux-1", name: "One", reasoning: true },
				{ id: "faux-2", name: "Two", reasoning: true },
			],
		});
		harnesses.push(harness);

		await harness.session.setModel(harness.getModel("faux-2")!);
		harness.session.setThinkingLevel("high");

		const entries = harness.sessionManager.getEntries();
		expect(entries.some((entry) => entry.type === "model_change")).toBe(true);
		expect(entries.some((entry) => entry.type === "thinking_level_change")).toBe(true);
	});
});
