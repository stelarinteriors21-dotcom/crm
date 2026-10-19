export function parseCallNotes(rawNotes: string | null | undefined): { systemTags: string[]; userNote: string } {
  if (!rawNotes) return { systemTags: [], userNote: "" };

  let text = rawNotes;
  const systemTags: string[] = [];

  // Match all [TAG...] blocks
  const bracketMatches = text.match(/\[[^\]]+\]/g);
  if (bracketMatches) {
    for (const match of bracketMatches) {
      if (
        match.includes("CONNECTED") ||
        match.includes("FAKE DIAL") ||
        match.includes("Quick Drop") ||
        match.includes("SHORT RING") ||
        match.includes("RINGOUT") ||
        match.includes("PARTIAL RING") ||
        match.includes("UNANSWERED") ||
        match.includes("Verified Device Log") ||
        match.includes("Direct Call") ||
        match.includes("Incoming Call") ||
        match.includes("1 RING HANGUP")
      ) {
        systemTags.push(match);
        text = text.replace(match, "");
      }
    }
  }

  // Strip dialer indicators and audio filenames
  text = text.replace(/Auto-(?:synced|detected)[^|.\n]+\.mp3\s*\|?/gi, "");
  text = text.replace(/Ringing No Response \(RNR\)|Customer did not answer/gi, "");
  text = text.replace(/\(\d+\s*s(?:ec|econds?)?\)/gi, "");

  // Clean up leftover separators, pipes, and whitespace
  text = text.replace(/\|\s*\|/g, "|");
  text = text.replace(/^\s*\|\s*|\s*\|\s*$/g, "");
  text = text.replace(/\s{2,}/g, " ").trim();
  text = text.replace(/^[-:| ]+|[-:| ]+$/g, "").trim();

  return { systemTags, userNote: text };
}
