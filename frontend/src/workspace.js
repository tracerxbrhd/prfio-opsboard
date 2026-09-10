import { createContext, useContext } from 'react';

export const WorkspaceContext = createContext(null);
export const useWorkspace = () => useContext(WorkspaceContext);
export const statuses = {
  backlog: 'Backlog',
  in_progress: 'In progress',
  in_review: 'In review',
  done: 'Done',
  planning: 'Planning',
  active: 'On track',
  at_risk: 'At risk',
  completed: 'Completed',
};
export const taskStatuses = ['backlog', 'in_progress', 'in_review', 'done'];
export const projectStatuses = ['planning', 'active', 'at_risk', 'completed'];
export const priorities = ['low', 'medium', 'high', 'urgent'];
export const dateLabel = (value, options = {}) =>
  new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', ...options }).format(
    new Date(`${value.slice(0, 10)}T12:00:00`),
  );
export const todayISO = () => new Date().toLocaleDateString('en-CA');
export const isOverdue = (task) => task.status !== 'done' && task.due_date < todayISO();
export const initials = (name = '?') =>
  name
    .split(' ')
    .map((word) => word[0])
    .slice(0, 2)
    .join('');
export function downloadCSV(tasks) {
  const rows = [
    ['ID', 'Task', 'Project', 'Status', 'Priority', 'Assignee', 'Deadline', 'Estimated hours'],
    ...tasks.map((task) => [
      task.id,
      task.title,
      task.project_name,
      statuses[task.status],
      task.priority,
      task.assignee_detail?.name || 'Unassigned',
      task.due_date,
      task.estimate_hours,
    ]),
  ];
  const csv = rows
    .map((row) =>
      row
        .map(
          (value) =>
            `"${String(value)
              .replace(/^[=+@-]/, "'$&")
              .replaceAll('"', '""')}"`,
        )
        .join(','),
    )
    .join('\r\n');
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  link.download = `opsboard-work-${todayISO()}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}
