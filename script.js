const puppeteer = require('puppeteer');
const axios = require('axios'); // Import axios for HTTP requests

(async () => {
    // Launch Puppeteer with --no-sandbox and --disable-setuid-sandbox flags
    const browser = await puppeteer.launch({
        headless: true, // Run in headless mode for automation environments
        args: ['--no-sandbox', '--disable-setuid-sandbox'], // Disable sandboxing
    });
    const page = await browser.newPage();

    // Navigate to the password-protected page
    await page.goto('https://www.missionmobilemed.com/care-capacity-counter', {
        waitUntil: 'networkidle2', // Wait for most network requests to complete
    });

    // Enter the password
    await page.type('input[type="password"]', 'MissionMed1!');

    // Handle the dialog/modal
    page.on('dialog', async (dialog) => {
        console.log('Dialog detected:', dialog.message());
        await dialog.accept(); // Simulates clicking "OK" or "Submit"
    });

    // Submit the form programmatically
    await page.evaluate(() => {
        document.querySelector('input[type="submit"]').click();
    });

    // Wait for navigation to complete
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    console.log('Logged in successfully!');

    // Manual timeout function to wait 10 seconds
    console.log('Waiting for the counter to fully load...');
    await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait for 10 seconds

    // Wait for the counter element to appear
    await page.waitForSelector('#num1_widget_1737660239621', { timeout: 30000 });

    // Extract the counter value
    const counterValue = await page.$eval('#num1_widget_1737660239621', (el) => {
        const text = el.textContent.trim();
        console.log('Raw Counter Text:', text);
        return parseInt(text.replace(/,/g, ''), 10); // Remove commas and parse as an integer
    });

    if (isNaN(counterValue)) {
        console.error('Failed to extract a valid counter value.');
        await browser.close();
        return;
    }

    console.log('Counter Value:', counterValue);

    // Send the value to the Smiirl counter using Axios
    const smiirlUrl = 'https://api.smiirl.com/v1/counter/e08e3c332414'; // Replace with your Smiirl Push URL
    try {
        const response = await axios.post(smiirlUrl, { value: counterValue });
        if (response.status === 200) {
            console.log('Smiirl counter updated successfully!');
        } else {
            console.error('Failed to update Smiirl counter:', response.status, response.statusText);
        }
    } catch (err) {
        console.error('Error updating Smiirl counter:', err.message || err);
    }

    await browser.close();
})();
