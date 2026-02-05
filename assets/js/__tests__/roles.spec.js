import { describe, it, expect, beforeEach } from 'vitest';
import { initRoleSwitcher } from '../roles.js';


describe('roles', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <select id="role-switcher">
        <option value="quality_specialist">QS</option>
        <option value="leadership">Lead</option>
      </select>
      <button data-tab="reports"></button>
      <button data-tab="tasks"></button>
      <button data-tab="dialog" id="dialog-tab"></button>
      <div id="reports-tab" class="active"></div>
      <div id="tasks-tab"></div>
    `;
  });

  it('initRoleSwitcher toggles tabs for quality specialist', () => {
    const switcher = document.getElementById('role-switcher');
    switcher.value = 'quality_specialist';
    initRoleSwitcher();

    const reports = document.querySelector('[data-tab="reports"]');
    const tasks = document.querySelector('[data-tab="tasks"]');
    expect(reports.classList.contains('hidden')).toBe(true);
    expect(tasks.classList.contains('hidden')).toBe(false);
  });

  it('initRoleSwitcher toggles tabs for leadership', () => {
    const switcher = document.getElementById('role-switcher');
    switcher.value = 'leadership';
    initRoleSwitcher();

    const reports = document.querySelector('[data-tab="reports"]');
    const tasks = document.querySelector('[data-tab="tasks"]');
    expect(reports.classList.contains('hidden')).toBe(false);
    expect(tasks.classList.contains('hidden')).toBe(true);
  });
});
