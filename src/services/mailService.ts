export async function sendFraudAlertEmail(email: string, tx: any) {
  const response = await fetch("http://localhost:8000/send-fraud-alert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, transaction: tx }),
  });

  if (!response.ok) {
    throw new Error("Failed to send fraud alert");
  }

  return response.json();
}