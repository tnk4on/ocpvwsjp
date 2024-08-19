# OpenShift Virtualization Workshop 日本語化

## コンテナイメージ

https://quay.io/tnk4on/ocpvwsjp

## 実行方法

### 前提条件
- Red Hat Demo Platformで**Experience OpenShift Virtualization Roadshow**をデプロイ済みであること
- 下記のアドレスでデプロイ済みのワークショップ画面にアクセスできること（<username>は各自のユーザーID）
```
https://demo.redhat.com/workshops/user-<username>-redhat-com/equinix-metal.roadshow-ocpvirt-2024.prod
```
- Apple Silicon Macの環境で実行する場合は、エミュレーションモードでamd64イメージが実行できること（Podman v5.1以降でRosetta 2を推奨）
    - 参考：[PodmanでRosettaを使う【Podman v5.1】 - 赤帽エンジニアブログ](https://rheb.hatenablog.com/entry/podman-rosetta)

### Podmanで実行する方法

```
% podman run --rm -it quay.io/tnk4on/ocpvwsjp
```

コンテナの実行後、ユーザー名とパスワード（PIN + TOKEN）を入力します。
```
Enter your KERBEROS ID: username
Enter your PIN + TOKEN: ************
```

認証が通ると自動で処理が実行されます。すべての処理が終わると自動で終了します。
```
[2024-08-19 11:04:49.616] Puppeteerを起動します
[2024-08-19 11:04:51.687] Red Hat Demo Platformのページにアクセスします
[2024-08-19 11:04:57.508] Red Hat Demo Platformのページにアクセスしました
...
[2024-08-19 11:06:35.006] 全ての処理が完了したので、ブラウザを閉じます
[2024-08-19 11:06:35.237] ブラウザを閉じました
```

再度コンテナを実行し、すべてのユーザーがパッチ適用済み（`no change`）になっていることを確認します。
```
...
[2024-08-19 11:05:13.232] -----Localization...
Localization Stdout: deployment.apps/showroom patched (no change)

[2024-08-19 11:05:18.127] -----OADP Update...
OADP Update Stdout: subscription.operators.coreos.com/redhat-oadp-operator-subscription patched (no change)
...
```

### エラーが出た場合

たまにエラー（コマンドタイムアウト）が出る場合もありますが、その際もコンテナを再実行しすべてのユーザーがパッチ適用済み（`no change`）になるまで繰り返します。
```
[2024-08-19 11:06:24.997] -----OADP Update...
Error: OADP Update command timed out
```

## コンテナイメージのビルド

### 前提条件

- Puppeteerに対応したGoogle Chromeをインストールするため、アーキテクチャーは「amd64」でビルドすること
- Apple Silicon Mac上でビルドする場合はRosetta 2を有効化すること。QEMUのエミュレーションではビルドに失敗します。

### ビルドコマンド

Rosettaの状態を確認（Podman v5.1以降）
```
% podman machine inspect --format {{.Rosetta}}
true
```

Gitリポジトリをクローンし、ビルド
```
% git clone https://github.com/tnk4on/ocpvwsjp
% cd ocpvwsjp
% podman build -t quay.io/tnk4on/ocpvwsjp --arch amd64 .
```