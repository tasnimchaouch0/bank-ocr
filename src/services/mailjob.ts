// mailJob.ts (or anywhere you want to trigger the emails)
import { sendFraudAlertEmail } from "./mailService";

async function checkFraudAndNotify() {
  try {
    const response = await fetch("http://localhost:8000/admin/predict/transactions");
    const transactions = await response.json();

    for (const tx of transactions) {
      if (tx.fraud_score > 0.8) { 
        await sendFraudAlertEmail(tx.customer_mail, tx);
        console.log(`✅ Fraud alert sent to ${tx.customer_mail}`);
      }
    }
  } catch (err) {
    console.error("Failed to check fraud and send emails:", err);
  }
}
export default checkFraudAndNotify
checkFraudAndNotify();
