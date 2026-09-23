import { describe, expect, it } from "vitest";
import { loadConfig } from "./config.ts";

const requiredEnv = {
	NHK_API_KEY: "nhk-key",
	LINE_CHANNEL_ACCESS_TOKEN: "line-token",
	LINE_USER_ID: "line-user",
};

describe("loadConfig", () => {
	it("全項目が揃っていれば Config を返す", () => {
		const config = loadConfig({
			...requiredEnv,
			TARGET_PROGRAM_NAME: "0655",
		});

		expect(config).toEqual({
			nhkApiKey: "nhk-key",
			lineChannelAccessToken: "line-token",
			lineUserId: "line-user",
			targetProgramName: "0655",
		});
	});

	it("TARGET_PROGRAM_NAME が未設定なら「ピタゴラ」になる", () => {
		expect(loadConfig(requiredEnv).targetProgramName).toBe("ピタゴラ");
	});

	it("TARGET_PROGRAM_NAME が設定されていればその値になる", () => {
		const config = loadConfig({
			...requiredEnv,
			TARGET_PROGRAM_NAME: "0655",
		});

		expect(config.targetProgramName).toBe("0655");
	});

	it("必須キーが欠けている・空文字の場合、欠けたキー名をすべて含むエラーになる", () => {
		const load = () => loadConfig({ NHK_API_KEY: "nhk-key", LINE_USER_ID: "" });

		expect(load).toThrow(/LINE_CHANNEL_ACCESS_TOKEN/);
		expect(load).toThrow(/LINE_USER_ID/);
		expect(load).not.toThrow(/NHK_API_KEY/);
	});
});
