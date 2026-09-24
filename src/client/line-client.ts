const PUSH_MESSAGE_URL = "https://api.line.me/v2/bot/message/push";

// リトライ（X-Line-Retry-Key）はしない。失敗はワークフロー失敗で検知する方針で、
// 二重送信で月 200 通の上限を浪費するリスクを避ける（Issue #9）。
// タイムアウトも設定しない。ワークフローの timeout-minutes で担保する（Issue #11）。
export async function pushTextMessage(
	text: string,
	credentials: { channelAccessToken: string; userId: string },
): Promise<void> {
	const response = await fetch(PUSH_MESSAGE_URL, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${credentials.channelAccessToken}`,
		},
		body: JSON.stringify({
			to: credentials.userId,
			messages: [{ type: "text", text }],
		}),
	});

	if (!response.ok) {
		// ログに認証情報を出さないため、トークンやリクエストヘッダーは含めない。
		const responseBody = await response.text();
		throw new Error(
			`LINE へのプッシュメッセージ送信に失敗した: ${response.status} ${responseBody}`,
		);
	}
}
