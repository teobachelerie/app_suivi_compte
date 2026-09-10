function csvField(v) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function transactionsToCSV(transactions) {
  const header = ["date", "type", "montant", "categorie", "compte", "paiement", "titre", "tags"];
  const rows = transactions.map((t) => [t.date, t.type, t.amount, t.category, t.compte, t.payment, t.title, (t.tags || []).join(";")].map(csvField).join(","));
  return [header.join(","), ...rows].join("\n");
}

export function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
