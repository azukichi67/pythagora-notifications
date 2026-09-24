import { pushTextMessage } from "./client/line-client.ts";
import { fetchBroadcasts } from "./client/nhk-client.ts";
import { loadConfig } from "./config.ts";
import {
	buildSummary,
	pickTargetBroadcasts,
} from "./service/pythagora-service.ts";

try {
	const config = loadConfig();
	console.log(`対象番組名: ${config.targetProgramName}`);

	const broadcasts = await fetchBroadcasts({
		apiKey: config.nhkApiKey,
		now: new Date(),
		fetch,
	});
	console.log(`取得件数: ${broadcasts.length}`);

	const targetBroadcasts = pickTargetBroadcasts(
		broadcasts,
		config.targetProgramName,
	);
	console.log(`抽出件数: ${targetBroadcasts.length}`);

	await pushTextMessage(buildSummary(targetBroadcasts), {
		channelAccessToken: config.lineChannelAccessToken,
		userId: config.lineUserId,
	});
	console.log("LINE への送信に成功した");
} catch (error) {
	console.error(error);
	process.exitCode = 1;
}
