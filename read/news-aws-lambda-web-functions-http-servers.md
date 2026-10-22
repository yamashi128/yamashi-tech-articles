# AWS Lambda Web Functions登場：HTTP serverをそのまま載せても、Lambdaの設計責任は消えない

YAMASHI TECH AI Editorial Desk | News | Software Engineering / DevTools / Industry

[掲載ページ](https://yamashi-tech.com/articles/news-aws-lambda-web-functions-http-servers) · [原稿データ](../articles/news-aws-lambda-web-functions-http-servers.json)

公開: 2026-10-20 / 更新: 2026-10-20 / 確認: 2026-10-20

AWSはNode.jsのport-listening serverをadapterなしで動かすLambda Web Functionsを公開した。最大128 concurrent request、active CPU課金、複数region endpointを備えるが、runtime、memory、endpoint認証、state、costの適合性は個別に判断する必要がある。

## 要点：LambdaへHTTP serverを合わせるのではなく、serverを受け入れるform factor

AWSは2026年10月12日、AWS Lambda Web Functionsを発表した。Express、Hono、Fastify、Next.jsなどのNode.js applicationがnetwork portでHTTP requestを受ける形を保ち、Lambda固有のevent handlerやadapterへ書き換えずにdeployできる。codeは`AWS_LAMBDA_HTTP_ENDPOINT`で与えられたhostとportをlistenする。

これは従来のLambda Event Functionsのrenameや置換ではない。AWSはEvent Functions、Web Functions、MicroVMsを別のprogramming modelとして整理する。queueやfile eventはEvent Functions、HTTP applicationはWeb Functions、untrusted codeやstateful sandboxはMicroVMsという選択になる。

- Fact：launch時はNode.js 24、Arm64をsupport
- Fact：一つのexecution environmentが最大128 concurrent requestを処理
- Fact：CPUはactive time、memoryはenvironment lifetimeで計測
- Recommendation：framework compatibilityより先にstate、concurrency、cost modelを確認する

## 何が起きたか：revisionとendpointで標準HTTP applicationを配る

Web Functionはcodeとconfigurationのimmutable snapshotであるrevisionと、HTTPS trafficを一つまたは二つのrevisionへ送るendpointから構成される。endpointはTLS domain、authentication、geographic scope、scaling、throttling、traffic weightを持つ。更新時は新revisionを作り、endpointの向き先を変える。

AWS CLIの`aws lambda-web deploy`はsourceをbundleし、function、revision、endpointを作る一連の入口として紹介されている。複数regionを指定すると一つのglobal URLの背後へreplicateし、best-effortのlatency-based routingを行う。簡単なcommandの裏でIAM、S3、region replicationが関わるため、権限と失敗単位を理解せずにproductionへ持ち込まない。

三つのLambda form factorの公式な位置付け

| 形態 | 実行model | 向くworkload | 主な確認点 |
| --- | --- | --- | --- |
| Event Functions | eventごとにsingle-concurrent handler | queue、file、service event | wall-clock billing、event contract |
| Web Functions | port-listening HTTP、multi-concurrent | Web、API、SSR、streaming | CPU／memory billing、shared process state |
| MicroVMs | isolated stateful sandbox | untrusted／user-generated code | lifecycle、network、isolation cost |

## 以前との違い：adapter層とsingle-concurrency前提を外す

従来のLambda Event FunctionへWeb frameworkを載せる場合、API GatewayやFunction URLのeventをframework requestへ変換するadapterが必要になることがある。Web Functionsではapplication自身がHTTPをlistenし、standard serverのrequest／response modelを使う。移植時の変換codeは減るが、platformのlifecycleが通常の常駐serverと同じになるわけではない。

一つのenvironmentが複数requestを同時に扱うため、module-level mutable state、non-thread-safe相当のlibrary、requestごとのidentity、connection pool上限に注意が必要だ。single requestずつ処理される前提で書いたcodeはraceやdata leakを生む可能性がある。これはmulti-concurrency仕様から導く編集部のInferenceである。

## 課金の読み方：I/O待ちはCPUを消費しにくいが、memoryは残る

AWSはWeb Functionsでactive CPU timeをmeterし、databaseやexternal APIを待つ時間はCPU消費が小さいと説明する。一方、memoryはexecution environmentが存在する時間に対して計測され、request、data transferも費用要素になる。I/O-heavyなら必ず安くなるという保証ではなく、CPU burst、memory footprint、concurrency、idle scale-downで結果が変わる。

Event Functions、container service、managed instanceとの比較では、同じrequest数だけでなくp50／p95 latency、CPU time、resident memory、outbound transfer、region数、observability、minimum capacityを揃える。providerのexampleを自分のbillへ直接掛け算せず、小さいtraffic shadowまたはsynthetic workloadで見積もる。

## 誰に影響するか：Node.jsのWeb／APIをserverlessへ寄せたいteam

ExpressやHonoなどで標準HTTP serverを既に持ち、trafficが変動し、global endpointやscale-to-zeroを求めるteamは候補になる。SSR、REST／GraphQL API、streaming responseも公式use caseに含まれる。launch時点ではNode.js runtimeのみで、Python、Java、.NET applicationを同じ方式で載せる発表ではない。

常時高負荷、local diskへstateを置くapplication、long-lived background worker、protocol upgrade、特別なnative dependency、厳密なregion固定がある場合は、採用前に制約を確認する。standard HTTPが動くという一文だけで、既存containerのprocess model、health check、graceful shutdown、observabilityを同一視できない。

## 今できること：local serverとplatform adapterを分けてsample化する

最初はproduction applicationを直接deployせず、同じframeworkとmiddlewareを使う小さなsampleで、`AWS_LAMBDA_HTTP_ENDPOINT`のhost・port、health endpoint、streaming、error response、shutdownを確認する。次にauthenticationなしのpublic endpointを作る前に、CloudFront OAC、resource policy、application authのどこでrequestを止めるかを設計する。

migration candidateでは、filesystem write、in-memory session、cron、queue consumer、WebSocket、background promiseを洗い出す。Web requestから切り離すべき仕事はEvent Functionsや別queueへ移す。deploy commandが成功したことではなく、concurrency test、failure test、rollback、logとmetricが揃うことを完了条件にする。

platform固有部分を一行へ閉じる最小形

```javascript
const [host, port] = process.env.AWS_LAMBDA_HTTP_ENDPOINT.split(':');
app.listen(Number(port), host);

// localでは同じ変数を127.0.0.1:3000に設定して起動する
```

## まだ分からないこと：実applicationのcold start、費用、互換性

公開資料だけでは、frameworkごとのbundle size、cold start、connection reuse、maximum request duration、streaming backpressure、global routingの切替時間、region障害時の挙動をこの記事で独立確認できない。quotaとpricingもaccount、region、traffic shapeで変わり得る。

また、VPC接続が可能でも、private databaseへの安全な接続、security group、DNS、credential rotation、connection stormが自動で解決されるわけではない。最大128 concurrent requestをそのままdatabase poolへ流すと、downstreamが先に飽和する可能性がある。concurrency上限は能力値ではなく、依存先と一緒に制御する値として扱う。

## 次に確認する条件：runtime、region、quota、pricingが広がったとき

次の確認条件は、Node.js以外のruntimeが追加されたとき、regionとarchitectureが増えたとき、quota・pricing・endpoint authentication・CloudFront連携が更新されたときである。採用teamはAWSのreleaseだけでなく、使用frameworkのofficial supportと、自分のload test結果も同じ日付で記録したい。

現時点では、Web Functionsは標準HTTP serverとLambdaの距離を縮める有力な選択肢だが、containerを一commandで同じ性質のまま移せる仕組みではない。adapter削減を入口にし、state、concurrency、security、cost、rollbackを測れるapplicationから試すのがよい。最後の文は編集部のRecommendationである。

## 制約と未検証範囲

- 本稿はAWSの2026年10月12日の発表とLambda Web Functions documentationを照合した資料調査である。AWS account、IAM、AWS CLI、Web Function、S3、CloudFront、VPC、課金を伴うdeployやload testは実行していない。
- 最大128 concurrent request、global routing、active CPU billing、性能・費用に関する説明はAWSの仕様またはprovider例であり、個別applicationのlatency、cold start、throughput、費用削減を独立検証したものではない。
- launch時点のNode.js 24・Arm64、region、quota、pricing、framework compatibility、endpoint access controlは変わり得る。production採用前に最新documentationと対象accountの条件を再確認する必要がある。
- 標準HTTP serverを動かせることは、container、VM、ECS、Lambda Event Functionsから無変更で移行できることや、session・filesystem・background taskが同じ意味で動くことを保証しない。

## 確認したもの

- [AWS News Blog — Announcing AWS Lambda Web Functions (2026-10-12)](https://aws.amazon.com/blogs/aws/announcing-aws-lambda-web-functions-for-fast-consistent-web-app-performance-anywhere/)
- [AWS Lambda Developer Guide — Lambda Web Functions (checked 2026-10-20)](https://docs.aws.amazon.com/lambda/latest/dg/web-functions.html)
- [AWS Lambda Developer Guide — Creating a Lambda Web Function (checked 2026-10-20)](https://docs.aws.amazon.com/lambda/latest/dg/web-functions-create.html)
