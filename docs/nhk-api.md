# NHK 番組表 API Ver.3

前提: 用語・データモデルは [domain.md](./domain.md)、制約は [requirements.md](./requirements.md) を参照。

実レスポンスを取得して確認した結果を記録する（確認日: 2026-09-22）。Ver.3 の仕様は公式ポータルに公開されておらず、キー保有者が実行して確認する形式のため、この文書が実装時の唯一の入力になる。サンプル JSON は `docs/samples/` に置くが、利用規約の情報提供期間の制約（C-009）によりコミットしない。

## エンドポイント

```
GET https://program-api.nhk.jp/v3/papiPgDateTv
```

| パラメータ | 値 | 内容 |
|---|---|---|
| `service` | `e` / `g` | `e` = E テレ、`g` = 総合 |
| `area` | `140` | 東京。レスポンスの `location` は `{"id":"001","name":"東京"}` |
| `date` | `YYYY-MM-DD` | 放送日。24 時間の区切りではない（後述） |
| `key` | API キー | 環境変数 `NHK_API_KEY` から渡す |

## レスポンス構造

ルートは `service` の値をキーに持つ。`service=e` なら `.e`、`g` なら `.g`。

```
.<service>.publication[]        ← 放送の配列
```

1 日あたりの件数は E テレ 78 件、総合 57 件（2026-09-29 実測）。

### 放送のフィールド

[domain.md](./domain.md) の「放送」データモデルとの対応。

| 属性 | フィールド | 例 |
|---|---|---|
| 番組名 | `identifierGroup.tvSeriesName` | `ピタゴラスイッチ ミニ` |
| サブタイトル | `identifierGroup.tvEpisodeName` | `▽ねんどれナンドレラッツの跡じまん▽うた` |
| 開始日時 | `startDate` | `2026-09-30T04:00:00+09:00` |
| 終了日時 | `endDate` | `2026-09-30T04:05:00+09:00` |

- `startDate` / `endDate` は ISO 8601 形式で JST オフセット付き。タイムゾーン変換は不要
- `tvEpisodeName` は先頭に `▽` が付く。除去せずそのまま使う
- `publication[].name` は番組名とサブタイトルを `▽` で連結した文字列（`ピタゴラスイッチ　ミニ▽ねんどれ…`）。番組名側の末尾に全角スペースが入る揺れがあるが、`tvSeriesName` は半角スペースに正規化済み。`name` は使わない

その他、`duration`（`PT10M` 形式）、`description`（番組内容）、`identifierGroup.genre` などが存在するが、本システムでは使わない。

### `tvSeriesName` が空になる放送

ニュース・解説・単発番組では `identifierGroup` に `tvSeriesName` キー自体が存在しない（null でも空文字でもない。E テレ 2 件 / 総合 12 件、2026-09-29 実測）。`tvEpisodeName` も同様に、ない場合はキーごと欠ける。

ピタゴラ系については、**8 日分 × 2 波で抽出した 16 件すべてが埋まっていた**。定時枠外の放送（`2026-09-22T09:41 こどもたちよ　あたまをつかえ！　スペシャル` など、[domain.md](./domain.md) でいう特別版）も含めて空はなかった。このため `tvSeriesName` への部分一致で抽出して差し支えない。

## `date` の範囲は 24 時間ではない

`date` は放送日であり、深夜帯は翌日の日付を持つ。

| service | 1 日分の範囲 |
|---|---|
| `e` | 当日 05:30 〜 翌日 05:30 |
| `g` | 当日 05:00 〜 翌日 05:00 |

`date=2026-09-29` のレスポンスに `2026-09-30T04:00:00+09:00` の放送が含まれる。総合のピタゴラスイッチ ミニは 04:00 台の放送であり、**前日の `date` で取得される**。`startDate` の日付で `date` を逆算すると取りこぼす。

## 取得可能な日付範囲

**当日から 7 日先まで（当日を含む 8 日分）。** 8 日先を指定すると 400 が返る。

```
date=2026-09-29 （7 日先） → 200
date=2026-09-30 （8 日先） → 400
date=2026-10-01 （9 日先） → 400
```

実行日は 2026-09-22。

## エラーレスポンス

範囲外の日付を指定した場合、HTTP 400 で以下が返る（前後に空白と改行を含む）。

```json
{"error": "Invalid request"}
```

エラーの種別を区別する情報は含まれない。

## 呼び出し方

キーを URL に直書きするとシェル履歴に残るため、環境変数経由で渡す。

```bash
set -a; . ./.env; set +a
curl -sS "https://program-api.nhk.jp/v3/papiPgDateTv?service=e&area=140&date=2026-09-29&key=$NHK_API_KEY" \
  -o docs/samples/e-20260929.json
```

利用回数は 300 回/日・ローリング 24 時間（C-007）。調査時は保存した JSON に対して jq を実行し、API を叩き直さない。

```bash
jq -r '.e.publication[]
  | select(.identifierGroup.tvSeriesName // "" | test("ピタゴラ"))
  | {series: .identifierGroup.tvSeriesName, ep: .identifierGroup.tvEpisodeName, startDate, endDate}' \
  docs/samples/e-20260929.json
```
