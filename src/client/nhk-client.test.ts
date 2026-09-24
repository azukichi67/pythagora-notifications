import { describe, expect, it, vi } from "vitest";
import { fetchBroadcasts } from "./nhk-client.ts";

// JST 2026-09-28 00:30。UTC ではまだ 09-27
const NOW = new Date("2026-09-27T15:30:00Z");

// 実データでは番組名・サブタイトルがない枠は null ではなくキー自体が欠ける
const E_PUBLICATIONS = [
	{
		name: "ピタゴラスイッチ▽紙コップコップ暗号▽うた",
		startDate: "2026-09-28T06:45:00+09:00",
		endDate: "2026-09-28T06:55:00+09:00",
		identifierGroup: {
			tvSeriesName: "ピタゴラスイッチ",
			tvEpisodeName: "▽紙コップコップ暗号▽うた",
		},
	},
	{
		name: "放送休止",
		startDate: "2026-09-28T05:30:00+09:00",
		endDate: "2026-09-28T05:35:00+09:00",
		identifierGroup: {},
	},
];

const G_PUBLICATIONS = [
	{
		name: "ピタゴラスイッチ　ミニ",
		startDate: "2026-09-28T05:10:00+09:00",
		endDate: "2026-09-28T05:15:00+09:00",
		identifierGroup: { tvSeriesName: "ピタゴラスイッチ ミニ" },
	},
];

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), { status });
}

// 先頭の date だけに放送を入れ、残りの日は空にする
function stubFetch() {
	return vi.fn<typeof globalThis.fetch>(async (input) => {
		const url = new URL(input.toString());
		const service = url.searchParams.get("service") ?? "";
		const isFirstDate = url.searchParams.get("date") === "2026-09-28";
		const publications = { e: E_PUBLICATIONS, g: G_PUBLICATIONS }[service];
		return jsonResponse({
			[service]: { publication: isFirstDate ? publications : [] },
		});
	});
}

function requestedUrls(fetch: ReturnType<typeof stubFetch>): URL[] {
	return fetch.mock.calls.map(([input]) => new URL(input.toString()));
}

describe("fetchBroadcasts", () => {
	it("E テレ・総合 × JST の当日から 8 日分を 16 リクエストで取得する", async () => {
		const fetch = stubFetch();

		await fetchBroadcasts({ apiKey: "nhk-key", now: NOW, fetch });

		const urls = requestedUrls(fetch);
		expect(urls).toHaveLength(16);
		for (const url of urls) {
			expect(url.origin + url.pathname).toBe(
				"https://program-api.nhk.jp/v3/papiPgDateTv",
			);
			expect(url.searchParams.get("area")).toBe("140");
			expect(url.searchParams.get("key")).toBe("nhk-key");
		}
		const dates = [
			"2026-09-28",
			"2026-09-29",
			"2026-09-30",
			"2026-10-01",
			"2026-10-02",
			"2026-10-03",
			"2026-10-04",
			"2026-10-05",
		];
		expect(
			urls.map(
				(url) =>
					`${url.searchParams.get("service")}:${url.searchParams.get("date")}`,
			),
		).toEqual([
			...dates.map((date) => `e:${date}`),
			...dates.map((date) => `g:${date}`),
		]);
	});

	it("tvSeriesName がない枠を除外し、開始日時の昇順で「放送」に変換する", async () => {
		const broadcasts = await fetchBroadcasts({
			apiKey: "nhk-key",
			now: NOW,
			fetch: stubFetch(),
		});

		expect(broadcasts).toEqual([
			{
				seriesName: "ピタゴラスイッチ ミニ",
				subtitle: null,
				startsAt: new Date("2026-09-28T05:10:00+09:00"),
				endsAt: new Date("2026-09-28T05:15:00+09:00"),
			},
			{
				seriesName: "ピタゴラスイッチ",
				subtitle: "▽紙コップコップ暗号▽うた",
				startsAt: new Date("2026-09-28T06:45:00+09:00"),
				endsAt: new Date("2026-09-28T06:55:00+09:00"),
			},
		]);
	});

	it("HTTP エラーなら service・date・ステータス・本文を含む例外を投げる", async () => {
		const fetch = vi.fn<typeof globalThis.fetch>(async () =>
			jsonResponse({ error: "Invalid request" }, 400),
		);

		await expect(
			fetchBroadcasts({ apiKey: "nhk-key", now: NOW, fetch }),
		).rejects.toThrow(
			/service=e date=2026-09-28 status=400 body=\{"error":"Invalid request"\}/,
		);
	});

	it("publication の配列がないレスポンスなら例外を投げる", async () => {
		const fetch = vi.fn<typeof globalThis.fetch>(async () =>
			jsonResponse({ e: {} }),
		);

		await expect(
			fetchBroadcasts({ apiKey: "nhk-key", now: NOW, fetch }),
		).rejects.toThrow(/e\.publication/);
	});
});
