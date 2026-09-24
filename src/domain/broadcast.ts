export type Broadcast = Readonly<{
	seriesName: string;
	subtitle: string | null;
	startsAt: Date;
	endsAt: Date;
}>;
