import { qs, qsa, on } from './core/dom.js';

export function initRoleSwitcher() {
    const switcher = qs('#role-switcher');
    if (!switcher) return;

    const handleRoleChange = () => {
        const role = switcher.value;
        applyRole(role);
    };

    on(switcher, 'change', handleRoleChange);

    // Initialize with current value
    applyRole(switcher.value);
}

function applyRole(role) {
    const reportsTabBtn = qs('[data-tab="reports"]');
    const tasksTabBtn = qs('[data-tab="tasks"]');
    const dialogTabBtn = qs('[data-tab="dialog"]');

    // Tab Content containers
    const reportsTabContent = qs('#reports-tab');
    const tasksTabContent = qs('#tasks-tab');

    if (role === 'quality_specialist') {
        // Quality Specialist: Show Tasks, Hide Reports
        // Focus: Dialog Quality & Instructions

        if (tasksTabBtn) tasksTabBtn.classList.remove('hidden');
        if (reportsTabBtn) reportsTabBtn.classList.add('hidden');

        // If currently on Reports tab, switch to Dialog
        if (reportsTabContent && reportsTabContent.classList.contains('active')) {
            if (dialogTabBtn) dialogTabBtn.click();
        }

        updateRoleContext('Quality Specialist');

    } else if (role === 'leadership') {
        // Leadership: Hide Tasks, Show Reports
        // Focus: Efficiency/Quality/Reports

        if (tasksTabBtn) tasksTabBtn.classList.add('hidden');
        if (reportsTabBtn) reportsTabBtn.classList.remove('hidden');

        // If currently on Tasks tab, switch to Reports
        if (tasksTabContent && tasksTabContent.classList.contains('active')) {
            reportsTabBtn?.click();
        } else if (qs('#dialog-tab')?.classList.contains('active') && !reportsTabContent?.classList.contains('active')) {
            // Optional: Auto-switch to reports for leaders?
            // Let's not force it if they are on dialog, but valid option.
            // For now, let's just ensure available options are correct.
        }

        updateRoleContext('Leadership Team');
    }
}

function updateRoleContext(roleName) {
    // Helper to log or notify context change if needed
    console.log(`Role switched to: ${roleName}`);
    // Potentially show a notification or update other UI elements
}
