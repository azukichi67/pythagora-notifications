import { describe, expect, it } from "vitest";
import type { Broadcast } from "../domain/broadcast.ts";
import { buildSummary, pickTargetBroadcasts } from "./pythagora-service.ts";

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

describe("pickTargetBroadcasts", () => {
	it("番組名に対象番組名を含むピタゴラ系 3 シリーズを残す", () => {
		const broadcasts = [
			broadcast("2026-09-28T07:00:00+09:00", "ピタゴラスイッチ", null),
			broadcast("2026-09-28T08:00:00+09:00", "ピタゴラスイッチ ミニ", null),
			broadcast("2026-09-28T09:00:00+09:00", "大人のピタゴラスイッチ", null),
		];

		expect(pickTargetBroadcasts(broadcasts, "ピタゴラ")).toEqual(broadcasts);
	});

	it("番組名に対象番組名を含まない放送を除く", () => {
		const target = broadcast(
			"2026-09-28T07:00:00+09:00",
			"ピタゴラスイッチ",
			null,
		);
		const unrelated = broadcast("2026-09-28T07:10:00+09:00", "0655", null);

		expect(pickTargetBroadcasts([target, unrelated], "ピタゴラ")).toEqual([
			target,
		]);
	});

	it("サブタイトルにだけ対象番組名を含む放送を除く", () => {
		const broadcasts = [
			broadcast("2026-09-28T07:00:00+09:00", "0655", "▽ピタゴラ装置のうた"),
		];

		expect(pickTargetBroadcasts(broadcasts, "ピタゴラ")).toEqual([]);
	});

	it("該当する放送が 0 件なら空の一覧を返す", () => {
		const broadcasts = [broadcast("2026-09-28T07:00:00+09:00", "0655", null)];

		expect(pickTargetBroadcasts(broadcasts, "ピタゴラ")).toEqual([]);
	});

	it("対象番組名を変えるとその値で抽出する", () => {
		const target = broadcast("2026-09-28T07:00:00+09:00", "0655", null);
		const broadcasts = [
			broadcast("2026-09-28T06:55:00+09:00", "ピタゴラスイッチ", null),
			target,
		];

		expect(pickTargetBroadcasts(broadcasts, "0655")).toEqual([target]);
	});

	it("入力の順序を保ち、引数の配列を変更しない", () => {
		const later = broadcast(
			"2026-09-29T07:00:00+09:00",
			"ピタゴラスイッチ",
			null,
		);
		const unrelated = broadcast("2026-09-28T08:00:00+09:00", "0655", null);
		const earlier = broadcast(
			"2026-09-28T07:00:00+09:00",
			"ピタゴラスイッチ ミニ",
			null,
		);
		const broadcasts = [later, unrelated, earlier];

		expect(pickTargetBroadcasts(broadcasts, "ピタゴラ")).toEqual([
			later,
			earlier,
		]);
		expect(broadcasts).toEqual([later, unrelated, earlier]);
	});
});
