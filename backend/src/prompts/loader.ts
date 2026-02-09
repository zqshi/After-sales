/* eslint-disable no-console */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..');
const defaultPromptRoot = path.join(repoRoot, 'docs', 'prompts');
const promptRoot = process.env.PROMPT_ROOT || defaultPromptRoot;

const extractPromptBlock = (raw: string): string => {
  const marker = '```prompt';
  if (!raw.includes(marker)) {
    return raw.trim();
  }
  const start = raw.indexOf(marker);
  if (start === -1) {
    return raw.trim();
  }
  const lineBreak = raw.indexOf('\n', start);
  if (lineBreak === -1) {
    return raw.trim();
  }
  const end = raw.indexOf('```', lineBreak + 1);
  if (end === -1) {
    return raw.trim();
  }
  return raw.slice(lineBreak + 1, end).trim();
};

export const loadPrompt = (relativePath: string, fallback = ''): string => {
  const promptPath = path.join(promptRoot, relativePath);
  if (!fs.existsSync(promptPath)) {
    return fallback;
  }
  try {
    const raw = fs.readFileSync(promptPath, 'utf-8');
    return extractPromptBlock(raw);
  } catch (err) {
    console.warn('[PromptLoader] Failed to read prompt file:', promptPath, err);
    return fallback;
  }
};

export const renderPrompt = (
  template: string,
  vars: Record<string, string | number | undefined>,
): string => {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = vars[key];
    return value === undefined ? '' : String(value);
  });
};
