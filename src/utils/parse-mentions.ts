// Parse @-mentioned files from user input
export function parseMentionedFiles(input: string): string[] {
  const mentions: string[] = [];
  const regex = /@([^\s@]+)/g;
  let match;

  while ((match = regex.exec(input)) !== null) {
    mentions.push(match[1]);
  }

  return mentions;
}
