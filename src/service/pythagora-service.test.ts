import { describe, expect, it } from "vitest";
import type { Broadcast } from "../domain/broadcast.ts";
import { buildSummary } from "./pythagora-service.ts";

function broadcast(
	startsAt: string,
	seriesName: string,
	subtitle: string | null,
): Broadcast {
	const start = new Date(startsAt);
	return {
		seriesName,
		subtitle,
		startsAt: start,
		endsAt: new Date(start.getTime() + 10 * 60 * 1000),
	};
}

describe("buildSummary", () => {
	it("見出し・放送一覧・情報提供の表示をこの順に並べる", () => {
		const summary = buildSummary([
			broadcast(
				"2026-09-28T07:00:00+09:00",
				"ピタゴラスイッチ ミニ",
				"▽紙コップコップ暗号",
			),
			broadcast(
				"2026-09-29T16:50:00+09:00",
				"ピタゴラスイッチ",
				"▽ねんどれナンドレラッツの跡じまん▽うた",
			),
		]);

		expect(summary).toBe(
			[
				"どうも〜ピタゴラ通知のツーちんでーす",
				"今週のピタゴラ予定を通知しまーす",
				"",
				"9/28(月) 7:00 ピタゴラスイッチ ミニ",
				"▽紙コップコップ暗号",
				"9/29(火) 16:50 ピタゴラスイッチ",
				"▽ねんどれナンドレラッツの跡じまん▽うた",
				"",
				"情報提供:ＮＨＫ",
			].join("\n"),
		);
	});

	it("サブタイトルがない放送はサブタイトルの行を省く", () => {
		const summary = buildSummary([
			broadcast("2026-09-28T07:00:00+09:00", "ピタゴラスイッチ", null),
		]);

		expect(summary).toContain(
			"\n\n9/28(月) 7:00 ピタゴラスイッチ\n\n情報提供:ＮＨＫ",
		);
	});

	it("日時を JST で表示する", () => {
		const summary = buildSummary([
			broadcast("2026-09-27T15:30:00Z", "ピタゴラスイッチ", null),
		]);

		expect(summary).toContain("9/28(月) 0:30 ピタゴラスイッチ");
	});

	it("開始日時の昇順に並べる", () => {
		const summary = buildSummary([
			broadcast("2026-09-29T07:00:00+09:00", "ピタゴラスイッチ", "▽後"),
			broadcast("2026-09-28T07:00:00+09:00", "ピタゴラスイッチ", "▽先"),
		]);

		expect(summary.indexOf("▽先")).toBeLessThan(summary.indexOf("▽後"));
	});

	it("開始日時が同じ放送は入力順を保つ", () => {
		const summary = buildSummary([
			broadcast("2026-09-28T07:00:00+09:00", "ピタゴラスイッチ", "▽一つ目"),
			broadcast("2026-09-28T07:00:00+09:00", "ピタゴラスイッチ", "▽二つ目"),
		]);

		expect(summary.indexOf("▽一つ目")).toBeLessThan(summary.indexOf("▽二つ目"));
	});

	it("引数の配列を並べ替えない", () => {
		const later = broadcast(
			"2026-09-29T07:00:00+09:00",
			"ピタゴラスイッチ",
			null,
		);
		const earlier = broadcast(
			"2026-09-28T07:00:00+09:00",
			"ピタゴラスイッチ",
			null,
		);
		const broadcasts = [later, earlier];

		buildSummary(broadcasts);

		expect(broadcasts).toEqual([later, earlier]);
	});

	it("放送が 0 件でも見出しと情報提供の表示を含める", () => {
		expect(buildSummary([])).toBe(
			[
				"どうも〜ピタゴラ通知のツーちんでーす",
				"今週のピタゴラ予定を通知しまーす",
				"",
				"",
				"情報提供:ＮＨＫ",
			].join("\n"),
		);
	});
});
