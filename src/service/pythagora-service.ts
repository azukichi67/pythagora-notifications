import type { Broadcast } from "../domain/broadcast.ts";

const HEADER = [
	"どうも〜",
	"ピタゴラ通知のツーちんでーす",
	"今週のピタゴラ予定をお知らせしますよ～",
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
	const lines = buildDateSections(broadcasts).flatMap((section, index) => [
		...(index === 0 ? [] : [""]),
		`==== ${section.date} ====`,
		...section.lines,
	]);
	return [...HEADER, "", ...lines, "", CREDIT].join("\n");
}

type DateSection = { date: string; lines: string[] };

function buildDateSections(broadcasts: readonly Broadcast[]): DateSection[] {
	const sections: DateSection[] = [];
	const sortedBroadcasts = broadcasts.toSorted(
		(a, b) => a.startsAt.getTime() - b.startsAt.getTime(),
	);
	for (const broadcast of sortedBroadcasts) {
		const startsAt = formatStartsAt(broadcast.startsAt);
		const lines = formatBroadcast(broadcast, startsAt.time);
		const lastSection = sections.at(-1);
		if (lastSection?.date === startsAt.date) {
			lastSection.lines.push(...lines);
		} else {
			sections.push({ date: startsAt.date, lines });
		}
	}
	return sections;
}

function formatBroadcast(broadcast: Broadcast, time: string): string[] {
	const heading = `■ ${time} ${broadcast.seriesName}`;
	return broadcast.subtitle === null
		? [heading]
		: [heading, broadcast.subtitle];
}

function formatStartsAt(date: Date): { date: string; time: string } {
	const parts = Object.fromEntries(
		JST_DATE_TIME.formatToParts(date).map(({ type, value }) => [type, value]),
	);
	return {
		date: `${parts.month}/${parts.day}(${parts.weekday})`,
		time: `${parts.hour}:${parts.minute}`,
	};
}
