const puppeteer = require('puppeteer');
const readlineSync = require('readline-sync');
const { spawnSync } = require('child_process');

// main関数
(async () => {
    // 標準入力からユーザー名を取得し、変数に格納
    const username = readlineSync.question("Enter your KERBEROS ID: ");
    
    // 標準入力からパスワードを取得する関数
    const getPassword = () => {
        const stdin = process.stdin;
        const stdout = process.stdout;
        stdin.setRawMode(true);
        stdin.resume();
        stdin.setEncoding('utf8');

        let password = '';
        stdout.write('Enter your PIN + TOKEN: ');

        return new Promise((resolve) => {
            stdin.on('data', (char) => {
                switch (char) {
                    case '\u0004': // EOT (Ctrl-D)
                    case '\r': // Enter
                    case '\n': // Enter
                        stdin.setRawMode(false);
                        stdin.pause();
                        stdout.write('\n');
                        resolve(password);
                        break;
                    case '\u0003': // Ctrl-C
                        process.exit();
                        break;
                    case '\b': // Backspace
                    case '\x7f': // Delete
                        if (password.length > 0) {
                            password = password.slice(0, -1);
                            stdout.clearLine();
                            stdout.cursorTo(0);
                            stdout.write('Enter your PIN + TOKEN: ' + '*'.repeat(password.length));
                        }
                        break;
                    default:
                        password += char;
                        stdout.write('*');
                        break;
                }
            });
        });
    };

    // 取得したパスワードを変数に格納
    const password = await getPassword();

// 現在時刻を取得する関数（JST対応）
const getCurrentTime = () => {
    const now = new Date();
    now.setHours(now.getHours() + 9); // UTCからJSTに変換
    return now.toISOString().replace('T', ' ').replace('Z', '');
};

    // Puppeteerの起動
    console.log(`[${getCurrentTime()}] Puppeteerを起動します`);
    const browser = await puppeteer.launch({
        executablePath: '/usr/bin/google-chrome-stable',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // ここからブラウザの操作
    try {
        console.log(`[${getCurrentTime()}] Red Hat Demo Platformのページにアクセスします`);
        await page.goto('https://demo.redhat.com/catalog', { waitUntil: 'networkidle2' });
        console.log(`[${getCurrentTime()}] Red Hat Demo Platformのページにアクセスしました`);

        console.log(`[${getCurrentTime()}] Red Hat associate用の認証リンクをクリックします`);
        await page.evaluate(() => document.querySelector('a.primary-auth-link').click());
        await page.waitForSelector('#username', { visible: true });
        console.log(`[${getCurrentTime()}] Red Hat associate用の認証リンクをクリックしました`);

        console.log(`[${getCurrentTime()}] ユーザー名とパスワードを入力します`);
        await page.type('#username', username);
        
        await page.evaluate((password) => {
            const passwordField = document.querySelector('#password');
            passwordField.value = '';
            for (const char of password) {
                if (char === '\b' || char === '\x7f') {
                    passwordField.value = passwordField.value.slice(0, -1);
                } else {
                    passwordField.value += char;
                }
            }
        }, password);
        console.log(`[${getCurrentTime()}] ユーザー名とパスワードを入力しました`);

        console.log(`[${getCurrentTime()}] 「LOG IN」ボタンをクリックします`);
        await Promise.all([
            page.click('#submit'),
            page.waitForSelector('h1', { visible: true })
        ]);
        console.log(`[${getCurrentTime()}] 「LOG IN」ボタンをクリックしました`);

        console.log(`[${getCurrentTime()}] デプロイ済みのワークショップURLに遷移します`);
        const targetUrl = `https://demo.redhat.com/workshops/user-${username}-redhat-com/equinix-metal.roadshow-ocpvirt-2024.prod`;
        await page.goto(targetUrl, { waitUntil: 'networkidle2' });
        console.log(`[${getCurrentTime()}] デプロイ済みのワークショップURLに遷移しました`);

        console.log(`[${getCurrentTime()}] ワークショップタイトル（h4タグ）が表示されるのを待機します`);
        await page.waitForSelector('h4', { visible: true, timeout: 60000 });
        console.log(`[${getCurrentTime()}] ワークショップタイトル（h4タグ）が表示されました`);

        console.log(`[${getCurrentTime()}] 「Usersタブ」のボタンをクリックします`);
        const usersButtonClicked = await page.evaluate(() => {
            const xpath = "//span[contains(text(), 'Users')]/ancestor::button";
            const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
            const usersButton = result.singleNodeValue;
            if (usersButton) {
                usersButton.click();
                return true;
            }
            return false;
        });

        if (usersButtonClicked) {
            console.log(`[${getCurrentTime()}] 「Usersタブ」のボタンをクリックしました`);
        } else {
            console.error(`[${getCurrentTime()}] 「Usersタブ」のボタンが見つかりませんでした`);
        }

        // デバッグ用にスクリーンショットを撮る
        console.log(`[${getCurrentTime()}] デバッグ用に現在のページのスクリーンショットを撮ります`);
        await page.screenshot({ path: '/tmp/current_screenshot.png' });
        console.log(`[${getCurrentTime()}] スクリーンショットを撮りました > /tmp/current_screenshot.png`);

        console.log(`[${getCurrentTime()}] HTMLソースを取得します`);
        const htmlContent = await page.content();

        // ここから各ユーザー環境の設定 //////////////////////////////////////////////////////

        // IPアドレスとSSHパスワードを抽出
        console.log(`[${getCurrentTime()}] IPアドレスを抽出します`);
        const ipAddresses = htmlContent.split('\n')
            .filter(line => line.includes('The host you will be using for lab:'))
            .map(line => {
                const match = line.match(/The host you will be using for lab:\s*([\d.]+)/);
                return match ? match[1] : null;
            })
            .filter(ip => ip !== null);

        console.log(`[${getCurrentTime()}] 抽出されたIPアドレス:`, ipAddresses);

        console.log(`[${getCurrentTime()}] SSHパスワードを抽出します`);
        const passwords = htmlContent.split('\n')
            .filter(line => line.includes('SSH Password:'))
            .map(line => {
                const match = line.match(/SSH Password:\s*(\S+)/);
                return match ? match[1] : null;
            })
            .filter(password => password !== null);

        console.log(`[${getCurrentTime()}] 抽出されたパスワード:`, passwords);

        // spawnSync用のリモートコマンドを定義
        const remoteCommandA = `sudo ssh root@192.168.123.100 -o StrictHostKeyChecking=no -q 'bash -c "$(curl -fsSL https://gist.githubusercontent.com/tutsunom/09fe8e9d61bc19412b1004e5d34ee51d/raw/808f474e5a5be8f2d8abd030debfa2d5e1322f1d/localization.sh)"'`;
        const remoteCommandB = `sudo ssh root@192.168.123.100 -o StrictHostKeyChecking=no -q 'bash -c "$(curl -fsSL https://gist.githubusercontent.com/tutsunom/6bd26761df7b74dbc3e237ecfdc17840/raw/be1b8a181c71b598c4437c76483878d9390fc4df/oadp-upgrade.sh)"'`;

        // ループでSSHコマンドを実行
        console.log(`[${getCurrentTime()}] ループでSSHコマンドを実行します`);

        for (let i = 0; i < ipAddresses.length; i++) {
            const nowIP = ipAddresses[i];
            const nowPASS = passwords[i];

            console.log(`Processing IP: ${nowIP} with Password: ${nowPASS}`);
            
            // Localizationコマンドの実行
            console.log(`[${getCurrentTime()}] -----Localization...`);
            const localizationResult = spawnSync('sshpass', ['-p', nowPASS, 'ssh', '-o', 'StrictHostKeyChecking=no', '-q', `lab-user@${nowIP}`, remoteCommandA], { timeout: 10000 });

            if (localizationResult.error) {
                if (localizationResult.error.code === 'ETIMEDOUT') {
                    console.error('Error: Localization command timed out');
                } else {
                    console.error(`Error: ${localizationResult.error.message}`);
                }
            } else {
                console.log(`Localization Stdout: ${localizationResult.stdout.toString()}`);
                if (localizationResult.stderr.toString().trim() !== '') {
                    console.error(`Localization Stderr: ${localizationResult.stderr.toString()}`);
                }
            }

            // OADP Updateコマンドの実行
            console.log(`[${getCurrentTime()}] -----OADP Update...`);
            const updateResult = spawnSync('sshpass', ['-p', nowPASS, 'ssh', '-o', 'StrictHostKeyChecking=no', '-q', `lab-user@${nowIP}`, remoteCommandB], { timeout: 10000 });

            if (updateResult.error) {
                if (updateResult.error.code === 'ETIMEDOUT') {
                    console.error('Error: OADP Update command timed out');
                } else {
                    console.error(`Error: ${updateResult.error.message}`);
                }
            } else {
                console.log(`OADP Update Stdout: ${updateResult.stdout.toString()}`);
                if (updateResult.stderr.toString().trim() !== '') {
                    console.error(`OADP Update Stderr: ${updateResult.stderr.toString()}`);
                }
            }
        }

    } catch (error) {
        // デバッグ用にスクリーンショットを撮る
        console.error(`[${getCurrentTime()}] Error: エラースクリーンショットを撮ります`, error);
        await page.screenshot({ path: '/tmp/error_screenshot.png' });
        console.log(`[${getCurrentTime()}] エラースクリーンショットを撮りました > /tmp/error_screenshot.png`);

    } finally {
        console.log(`[${getCurrentTime()}] 全ての処理が完了したので、ブラウザを閉じます`);
        await browser.close();
        console.log(`[${getCurrentTime()}] ブラウザを閉じました`);
    }
})();
