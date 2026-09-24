import type { Broadcast } from "../domain/broadcast.ts";

const HEADER = [
	"どうも〜ピタゴラ通知のツーちんでーす",
	"今週のピタゴラ予定を通知しまーす",
];
// C-008: NHK 番組表 API 利用規約 第10条による表示義務
const CREDIT = "情報提供:ＮＨＫ";

// 実行環境（GitHub Actions は UTC）のタイムゾーンに依存させないため JST を明示する
const JST_DATE_TIME = new Intl.DateTimeFormat("ja-JP", {
	timeZone: "Asia/Tokyo",
	month: "numeric",
	day: "numeric",
	weekday: "short",
	hour: "numeric",
	minute: "2-digit",
	hourCycle: "h23",
});

export function pickTargetBroadcasts(
	broadcasts: readonly Broadcast[],
	targetProgramName: string,
): Broadcast[] {
	return broadcasts.filter((broadcast) =>
		broadcast.seriesName.includes(targetProgramName),
	);
}

export function buildSummary(broadcasts: readonly Broadcast[]): string {
	const lines = broadcasts
		.toSorted((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
		.flatMap(formatBroadcast);
	return [...HEADER, "", ...lines, "", CREDIT].join("\n");
}

function formatBroadcast(broadcast: Broadcast): string[] {
	const heading = `${formatStartsAt(broadcast.startsAt)} ${broadcast.seriesName}`;
	return broadcast.subtitle === null
		? [heading]
		: [heading, broadcast.subtitle];
}

function formatStartsAt(date: Date): string {
	const parts = Object.fromEntries(
		JST_DATE_TIME.formatToParts(date).map(({ type, value }) => [type, value]),
	);
	return `${parts.month}/${parts.day}(${parts.weekday}) ${parts.hour}:${parts.minute}`;
}
