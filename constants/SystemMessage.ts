export const SYSTEM_MESSAGE_PREFIX = '__system__';

export function buildSystemMessage(text: string) {
  return `${SYSTEM_MESSAGE_PREFIX}${text}`;
}

export function stripSystemPrefix(text: string) {
  if (!text) return text;
  return text.startsWith(SYSTEM_MESSAGE_PREFIX) ? text.slice(SYSTEM_MESSAGE_PREFIX.length) : text;
}

export function isSystemMessageText(text: string) {
  return !!text && text.startsWith(SYSTEM_MESSAGE_PREFIX);
}


