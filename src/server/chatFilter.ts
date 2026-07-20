const BLOCKED_WORDS = [
  'hack', 'cheat', 'nazi', 'racist', 'exploit'
];

export function sanitizeChatMessage(input: string): string {
  if (!input) return '';
  let sanitized = input.trim().slice(0, 150); // limit length
  
  // Basic profanity / offensive word filter
  BLOCKED_WORDS.forEach(word => {
    const regex = new RegExp(word, 'gi');
    sanitized = sanitized.replace(regex, '***');
  });

  return sanitized;
}
