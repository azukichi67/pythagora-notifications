import type { Broadcast } from "../domain/broadcast.ts";

const ENDPOINT = "https://program-api.nhk.jp/v3/papiPgDateTv";
const SERVICES = ["e", "g"] as const;
const AREA_TOKYO = "140";
const TARGET_DAYS = 8;
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

type Service = (typeof SERVICES)[number];

type Publication = {
	identifierGroup: {
		tvSeriesName: string | null;
		tvEpisodeName: string | null;
	};
	startDate: string;
	endDate: string;
};

export async function fetchBroadcasts(params: {
	apiKey: string;
	now: Date;
	fetch: typeof globalThis.fetch;
}): Promise<Broadcast[]> {
	const broadcasts: Broadcast[] = [];
	for (const service of SERVICES) {
		for (const date of listTargetDates(params.now)) {
			const publications = await fetchPublications({
				...params,
				service,
				date,
			});
			broadcasts.push(...publications.flatMap(toBroadcast));
		}
	}
	return broadcasts.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

function listTargetDates(now: Date): string[] {
	const todayJst = now.getTime() + JST_OFFSET_MS;
	return Array.from({ length: TARGET_DAYS }, (_, i) =>
		new Date(todayJst + i * DAY_MS).toISOString().slice(0, 10),
	);
}

async function fetchPublications(params: {
	apiKey: string;
	fetch: typeof globalThis.fetch;
	service: Service;
	date: string;
}): Promise<Publication[]> {
	const { apiKey, service, date } = params;
	const url = new URL(ENDPOINT);
	url.search = new URLSearchParams({
		service,
		area: AREA_TOKYO,
		date,
		key: apiKey,
	}).toString();

	const response = await params.fetch(url);
	if (!response.ok) {
		const body = await response.text();
		throw new Error(
			`NHK 番組表 API がエラーを返した: service=${service} date=${date} status=${response.status} body=${body}`,
		);
	}

	const json = await response.json();
	const publications = json?.[service]?.publication;
	if (!Array.isArray(publications)) {
		throw new Error(
			`NHK 番組表 API のレスポンスに ${service}.publication の配列がない: date=${date}`,
		);
	}
	return publications;
}

function toBroadcast(publication: Publication): Broadcast[] {
	const { tvSeriesName, tvEpisodeName } = publication.identifierGroup;
	if (tvSeriesName === null) {
		return [];
	}
	return [
		{
			seriesName: tvSeriesName,
			subtitle: tvEpisodeName,
			startsAt: new Date(publication.startDate),
			endsAt: new Date(publication.endDate),
		},
	];
}
