export const COMMON_CITIES = [
  "Thiruvananthapuram", "Trivandrum", "TVM", "Kochi", "Cochin", "Ernakulam", 
  "Kollam", "Quilon", "Thrissur", "Trichur", "Kozhikode", "Calicut", 
  "Alappuzha", "Alleppey", "Kannur", "Kottayam", "Palakkad", "Malappuram", 
  "Pathanamthitta", "Kasaragod", "Wayanad", "Idukki", "Bangalore", "Bengaluru", 
  "Chennai", "Madras", "Hyderabad", "Mumbai", "Delhi", "Coimbatore", "Attingal", "Varkala"
];

export interface ExtractedLead {
  name: string;
  phone: string;
  email?: string;
  city?: string;
  budget?: string;
  source?: string;
}

export function extractLeadsFromText(fullText: string): ExtractedLead[] {
  if (!fullText) return [];

  const lines = fullText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const rows: ExtractedLead[] = [];
  const seenPhones = new Set<string>();

  const phoneRegex = /(?:(?:\+91|91|0)[\s\-]?)?([6-9]\d{9})\b/;
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip likely table header rows
    if (/^(sr\.?\s*no|sl\.?\s*no|index|id|#)\b/i.test(line) && /phone|mobile|contact|name/i.test(line)) {
      continue;
    }

    const pMatch = line.match(phoneRegex);
    if (pMatch) {
      const phone = pMatch[1];
      if (seenPhones.has(phone)) continue;
      seenPhones.add(phone);

      const eMatch = line.match(emailRegex);
      const email = eMatch ? eMatch[1] : undefined;

      let remaining = line.replace(pMatch[0], " ").trim();
      if (email) remaining = remaining.replace(email, " ").trim();

      // Detect City from recognized locations
      let detectedCity: string | undefined = undefined;
      for (const city of COMMON_CITIES) {
        const cityRegex = new RegExp("\\b" + city + "\\b", "i");
        if (cityRegex.test(remaining)) {
          detectedCity = city;
          remaining = remaining.replace(cityRegex, " ").trim();
          break;
        }
      }

      // Detect Budget
      let detectedBudget: string | undefined = undefined;
      const budgetMatch = remaining.match(/(?:budget|approx\.?\s*budget)?[\s:]*(₹?\s*\d+\s*(?:L|Lakhs?|Cr|k)?(?:\s*-\s*₹?\s*\d+\s*(?:L|Lakhs?|Cr|k)?)?)/i);
      if (budgetMatch && (budgetMatch[0].toLowerCase().includes("l") || budgetMatch[0].toLowerCase().includes("cr") || budgetMatch[0].toLowerCase().includes("budget"))) {
        detectedBudget = budgetMatch[1].trim();
        remaining = remaining.replace(budgetMatch[0], " ").trim();
      }

      // Clean common labels and punctuation
      remaining = remaining
        .replace(/\b(name|client|customer|lead|contact|phone|mob|mobile|tel|email|city|location|address|budget)[\s:]+/gi, " ")
        .replace(/[,|\t;:]+/g, " ")
        .replace(/^\d+[\s.)-]+/, "") // remove leading row numbers like '1.', '2)', etc.
        .replace(/\s{2,}/g, " ")
        .trim();

      const name = remaining || `Lead ${phone.slice(-4)}`;

      rows.push({
        name,
        phone,
        email,
        city: detectedCity,
        budget: detectedBudget,
        source: "PDF_UPLOAD"
      });
    }
  }

  // Also support block-style formatted contacts if single-line phone didn't capture enough
  if (rows.length === 0) {
    // Try scanning for phone numbers anywhere in text
    const allPhoneMatches = [...fullText.matchAll(/(?:(?:\+91|91|0)[\s\-]?)?([6-9]\d{9})\b/g)];
    for (const match of allPhoneMatches) {
      const phone = match[1];
      if (seenPhones.has(phone)) continue;
      seenPhones.add(phone);
      rows.push({
        name: `Lead ${phone.slice(-4)}`,
        phone,
        source: "PDF_UPLOAD"
      });
    }
  }

  return rows;
}
