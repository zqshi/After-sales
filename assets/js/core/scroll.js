import { qs } from './dom.js';

export function scrollToBottom() {
  const chat = qs('#chat-messages');
  if (chat) {
    chat.scrollTop = chat.scrollHeight;
  }
}
