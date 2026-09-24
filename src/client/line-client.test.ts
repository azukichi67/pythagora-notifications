import { afterEach, describe, expect, it, vi } from "vitest";
import { pushTextMessage } from "./line-client.ts";

const credentials = {
	channelAccessToken: "secret-token",
	userId: "U1234567890",
};

function stubFetch(response: Response) {
	return vi.spyOn(globalThis, "fetch").mockResolvedValue(response);
}

function requestOf(fetchSpy: ReturnType<typeof stubFetch>) {
	const [url, init] = fetchSpy.mock.calls[0] ?? [];
	return {
		url,
		method: init?.method,
		headers: new Headers(init?.headers),
		body: JSON.parse(String(init?.body)),
	};
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe("pushTextMessage", () => {
	it("プッシュメッセージ API に POST で 1 回だけリクエストする", async () => {
		const fetchSpy = stubFetch(new Response("{}", { status: 200 }));

		await pushTextMessage("本文", credentials);

		expect(fetchSpy).toHaveBeenCalledTimes(1);
		const request = requestOf(fetchSpy);
		expect(request.url).toBe("https://api.line.me/v2/bot/message/push");
		expect(request.method).toBe("POST");
	});

	it("チャネルアクセストークンを Bearer 認証ヘッダーに付ける", async () => {
		const fetchSpy = stubFetch(new Response("{}", { status: 200 }));

		await pushTextMessage("本文", credentials);

		const { headers } = requestOf(fetchSpy);
		expect(headers.get("Authorization")).toBe("Bearer secret-token");
		expect(headers.get("Content-Type")).toBe("application/json");
	});

	it("user ID 宛に、入力テキストを text メッセージ 1 件として送る", async () => {
		const fetchSpy = stubFetch(new Response("{}", { status: 200 }));

		await pushTextMessage("今週のピタゴラ\n- 9/24 7:00", credentials);

		expect(requestOf(fetchSpy).body).toEqual({
			to: "U1234567890",
			messages: [{ type: "text", text: "今週のピタゴラ\n- 9/24 7:00" }],
		});
	});

	it("非 2xx 応答なら、ステータスとレスポンスボディを含み、トークンを含まない例外を投げる", async () => {
		const errorBody = JSON.stringify({
			message: "The request body has 1 error(s)",
			details: [{ message: "Must be 5000 characters or less" }],
		});
		stubFetch(new Response(errorBody, { status: 400 }));

		const error = await pushTextMessage("本文", credentials).catch(
			(e: unknown) => e,
		);

		expect(error).toBeInstanceOf(Error);
		const { message } = error as Error;
		expect(message).toContain("400");
		expect(message).toContain(errorBody);
		expect(message).not.toContain("secret-token");
	});
});
