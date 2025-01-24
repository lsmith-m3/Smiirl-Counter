const puppeteer = require('puppeteer');
const axios = require('axios'); // Import axios for HTTP requests

(async () => {
    const browser = await puppeteer.launch({
        headless: true, // Run headless for automation environments
        args: ['--no-sandbox', '--disable-setuid-sandbox'], // Disable sandboxing
    });
    const page = await browser.newPage();

    await page.goto('https://www.missionmobilemed.com/care-capacity-counter', {
        waitUntil: 'networkidle2',
    });

    await page.type('input[type="password"]', 'MissionMed1!');

    page.on('dialog', async (dialog) => {
        console.log('Dialog detected:', dialog.message());
        await dialog.accept();
    });

    await page.evaluate(() => {
        document.querySelector('input[type="submit"]').click();
    });

    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    console.log('Waiting for the counter to fully load...');
    await new Promise((resolve) => setTimeout(resolve, 10000));

    await page.waitForSelector('#num1_widget_1737660239621', { timeout: 30000 });

    let counterValue = await page.$eval('#num1_widget_1737660239621', (el) => {
        const text = el.textContent.trim();
        console.log('Raw Counter Text:', text);
        return parseInt(text.replace(/,/g, ''), 10);
    });

    if (isNaN(counterValue) || counterValue < 0) {
        console.error('Invalid counter value. Defaulting to 0.');
        counterValue = 0;
    }

    console.log('Counter Value:', counterValue);

    const githubApiUrl = 'https://api.github.com/repos/lsmith-m3/Smiirl-Counter/contents/counter.json';
    const token = 'PERSONAL_ACCESS_TOKEN_2'; // Replace with your GitHub Personal Access Token

    try {
        // Get the current file SHA to update the file
        const { data: fileData } = await axios.get(githubApiUrl, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        const sha = fileData.sha;

        // Update the file with the new counter value
        const response = await axios.put(
            githubApiUrl,
            {
                message: 'Update counter value',
                content: Buffer.from(JSON.stringify({ number: counterValue })).toString('base64'),
                sha: sha,
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        );

        if (response.status === 200) {
            console.log('Counter value updated on GitHub successfully!');
        } else {
            console.error('Failed to update GitHub:', response.status, response.statusText);
        }
    } catch (err) {
        console.error('Error updating GitHub:', err.message || err);
    }

    await browser.close();
})();
