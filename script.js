const puppeteer = require('puppeteer');
const axios = require('axios'); // Import axios for HTTP requests

(async () => {
    const browser = await puppeteer.launch({
        headless: true, // Run headless for automation environments
        args: ['--no-sandbox', '--disable-setuid-sandbox'], // Disable sandboxing
    });
    const page = await browser.newPage();

    // Navigate to the password-protected page
    await page.goto('https://www.missionmobilemed.com/care-capacity-counter', {
        waitUntil: 'networkidle2',
    });

    // Enter the password
    await page.type('input[type="password"]', 'MissionMed1!');

    // Handle dialog/modal
    page.on('dialog', async (dialog) => {
        console.log('Dialog detected:', dialog.message());
        await dialog.accept();
    });

    // Submit the form programmatically
    await page.evaluate(() => {
        document.querySelector('input[type="submit"]').click();
    });

    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    console.log('Waiting for the counter to fully load...');
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Extract the counter value
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
    const token = process.env.GH_TOKEN; // Use GITHUB_TOKEN provided by the workflow

    try {
        // Attempt to fetch the current file metadata (to get the SHA)
        console.log('Fetching file metadata...');
        const { data: fileData } = await axios.get(githubApiUrl, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        const sha = fileData.sha;
        console.log('File SHA:', sha);

        // Update the file if it exists
        console.log('Updating counter.json...');
        const response = await axios.put(
            githubApiUrl,
            {
                message: 'Update counter value',
                content: Buffer.from(JSON.stringify({ number: counterValue })).toString('base64'),
                sha: sha, // Use the existing SHA
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
        if (err.response?.status === 404) {
            // Handle case where file does not exist
            console.log('File not found. Creating counter.json...');
            const response = await axios.put(
                githubApiUrl,
                {
                    message: 'Create counter.json',
                    content: Buffer.from(JSON.stringify({ number: counterValue })).toString('base64'),
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            if (response.status === 201) {
                console.log('Counter.json created successfully!');
            } else {
                console.error('Failed to create counter.json:', response.status, response.statusText);
            }
        } else {
            // Log unexpected errors
            console.error('Error updating GitHub:', err.response?.data || err.message || err);
        }
    }

    await browser.close();
})();
