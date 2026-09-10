import { useState } from 'react';
import { api } from './api';
import { Modal } from './components';
import { Icon } from './icons';
import { priorities, projectStatuses, statuses, taskStatuses, todayISO, useWorkspace } from './workspace';

export default function Editor({ kind, record, project, close }) {
  const { data, user, reload, notify } = useWorkspace();
  const isProject = kind === 'project';
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState(
    isProject
      ? {
          name: record?.name || '',
          code: record?.code || '',
          client: record?.client || '',
          description: record?.description || '',
          owner: record?.owner || user.id,
          due_date: record?.due_date || todayISO(),
          status: record?.status || 'planning',
          color: record?.color || '#277b70',
        }
      : {
          title: record?.title || '',
          description: record?.description || '',
          project: record?.project || project?.id || data.projects.find((item) => !item.archived)?.id || '',
          assignee: record?.assignee || '',
          due_date: record?.due_date || todayISO(),
          status: record?.status || 'backlog',
          priority: record?.priority || 'medium',
          estimate_hours: record?.estimate_hours || 4,
          tags: record?.tags?.join(', ') || '',
        },
  );
  const set = (event) => setValues({ ...values, [event.target.name]: event.target.value });
  const field = (name, label, type = 'text', required = true, maxLength) => (
    <label className={name === 'description' ? 'full-width' : ''}>
      {label}
      {required && <span className="required"> *</span>}
      {name === 'description' ? (
        <textarea
          name={name}
          value={values[name]}
          onChange={set}
          rows={4}
          maxLength={maxLength}
          aria-invalid={!!errors[name]}
        />
      ) : (
        <input
          name={name}
          type={type}
          value={values[name]}
          onChange={set}
          required={required}
          maxLength={maxLength}
          min={type === 'number' ? 1 : undefined}
          max={type === 'number' ? 160 : undefined}
          step={type === 'number' ? 1 : undefined}
          aria-invalid={!!errors[name]}
          aria-describedby={errors[name] ? `error-${name}` : undefined}
        />
      )}
      {errors[name] && (
        <small className="field-error" id={`error-${name}`}>
          {String(errors[name])}
        </small>
      )}
    </label>
  );
  const select = (name, label, options, blank) => (
    <label>
      {label}
      <select name={name} value={values[name]} onChange={set} required={!blank} aria-invalid={!!errors[name]}>
        {blank && <option value="">{blank}</option>}
        {options.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
      {errors[name] && <small className="field-error">{String(errors[name])}</small>}
    </label>
  );
  async function submit(event) {
    event.preventDefault();
    setErrors({});
    setSaving(true);
    try {
      const payload = isProject
        ? { ...values, owner: Number(values.owner) }
        : {
            ...values,
            project: Number(values.project),
            assignee: values.assignee ? Number(values.assignee) : null,
            estimate_hours: Number(values.estimate_hours),
            tags: values.tags
              .split(',')
              .map((tag) => tag.trim())
              .filter(Boolean),
          };
      await api(`${isProject ? 'projects' : 'tasks'}/${record ? `${record.id}/` : ''}`, {
        method: record ? 'PATCH' : 'POST',
        body: payload,
      });
      await reload();
      notify(`${isProject ? 'Project' : 'Task'} ${record ? 'updated' : 'created'}.`);
      close();
    } catch (error) {
      setErrors({ ...error.fields, detail: error.message });
    } finally {
      setSaving(false);
    }
  }
  return (
    <Modal
      title={`${record ? 'Edit' : 'Create'} ${kind}`}
      description={
        isProject
          ? 'Give the work a clear owner and a destination.'
          : 'Make the next step clear for your team.'
      }
      close={close}
      wide
    >
      <form onSubmit={submit}>
        <div className="form-grid">
          {isProject ? (
            <>
              {field('name', 'Project name', 'text', true, 100)}
              {field('code', 'Project code', 'text', true, 8)}
              {field('client', 'Client or department', 'text', true, 80)}
              {select(
                'owner',
                'Project owner',
                data.team.map((person) => [person.id, person.name]),
              )}
              {select(
                'status',
                'Status',
                projectStatuses.map((status) => [status, statuses[status]]),
              )}
              {field('due_date', 'Target date', 'date')}
              {field('description', 'Project brief', 'text', false, 3000)}
              {field('color', 'Project color', 'color', true)}
            </>
          ) : (
            <>
              <div className="full-width">{field('title', 'Task title', 'text', true, 150)}</div>
              {select(
                'project',
                'Project',
                data.projects.filter((item) => !item.archived).map((item) => [item.id, item.name]),
              )}
              {select(
                'assignee',
                'Assignee',
                data.team.map((person) => [person.id, person.name]),
                'Unassigned',
              )}
              {select(
                'status',
                'Status',
                taskStatuses.map((status) => [status, statuses[status]]),
              )}
              {select(
                'priority',
                'Priority',
                priorities.map((priority) => [priority, priority[0].toUpperCase() + priority.slice(1)]),
              )}
              {field('due_date', 'Deadline', 'date')}
              {field('estimate_hours', 'Estimate (hours)', 'number')}
              {field('description', 'Description', 'text', false, 5000)}
              <div className="full-width">{field('tags', 'Tags (comma separated)', 'text', false, 155)}</div>
            </>
          )}
        </div>
        {errors.detail && (
          <div role="alert" className="error-banner">
            {errors.detail}
          </div>
        )}
        <div className="modal-footer">
          <button type="button" className="button secondary" onClick={close} disabled={saving}>
            Cancel
          </button>
          <button className="button primary" disabled={saving}>
            <Icon name={record ? 'check' : 'plus'} size={17} />
            {saving ? 'Saving…' : record ? 'Save changes' : `Create ${kind}`}
          </button>
        </div>
      </form>
    </Modal>
  );
}
