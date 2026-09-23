export type Config = Readonly<{
	nhkApiKey: string;
	lineChannelAccessToken: string;
	lineUserId: string;
	targetProgramName: string;
}>;

const DEFAULT_TARGET_PROGRAM_NAME = "ピタゴラ";

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
	const { NHK_API_KEY, LINE_CHANNEL_ACCESS_TOKEN, LINE_USER_ID } = env;
	if (!NHK_API_KEY || !LINE_CHANNEL_ACCESS_TOKEN || !LINE_USER_ID) {
		const requiredEntries = Object.entries({
			NHK_API_KEY,
			LINE_CHANNEL_ACCESS_TOKEN,
			LINE_USER_ID,
		});
		const missingKeys = requiredEntries
			.filter(([, value]) => !value)
			.map(([key]) => key);
		throw new Error(
			`必須の環境変数が設定されていない: ${missingKeys.join(", ")}`,
		);
	}

	return {
		nhkApiKey: NHK_API_KEY,
		lineChannelAccessToken: LINE_CHANNEL_ACCESS_TOKEN,
		lineUserId: LINE_USER_ID,
		targetProgramName: env.TARGET_PROGRAM_NAME || DEFAULT_TARGET_PROGRAM_NAME,
	};
}
