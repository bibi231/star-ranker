import "dotenv/config";
import { sendEmail } from "./lib/email";

async function testEmail() {
    console.log("Testing SMTP configuration...");
    const result = await sendEmail(
        "peterjohn2343@gmail.com",
        "Star Ranker - SMTP Configuration Test",
        `<div style="background:#020617;color:#f8fafc;padding:40px;font-family:sans-serif;">
            <h1 style="color:#10b981;">✅ Brevo SMTP Working</h1>
            <p>If you're reading this, your email configuration in .env is correct.</p>
            <p>Sent at: ${new Date().toISOString()}</p>
        </div>`
    );
    console.log("Result:", result);
    process.exit(0);
}

testEmail().catch(console.error);
