import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from './icons';
import { dateLabel, initials, isOverdue, statuses } from './workspace';

export function Avatar({ user, small = false }) {
  return (
    <span
      className={`avatar ${small ? 'small' : ''}`}
      style={{ '--avatar': user?.color || '#647780' }}
      title={user?.name || 'Unassigned'}
    >
      {initials(user?.name || '?')}
    </span>
  );
}

export function Status({ value }) {
  return (
    <span className={`status ${value}`}>
      <i />
      {statuses[value] || value}
    </span>
  );
}

export function Priority({ value }) {
  return (
    <span className={`priority ${value}`}>
      <span aria-hidden="true">
        {value === 'urgent' ? '↑↑' : value === 'high' ? '↑' : value === 'low' ? '↓' : '−'}
      </span>
      {value}
    </span>
  );
}

export function Progress({ value }) {
  return (
    <span className="progress-wrap">
      <span
        className="progress-track"
        role="progressbar"
        aria-label="Project progress"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span style={{ width: `${value}%` }} />
      </span>
      <span className="mono">{value}%</span>
    </span>
  );
}

export function Empty({
  title = 'A little breathing room.',
  description = 'No work matches these filters. Try a different view.',
  action,
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon name="tasks" size={30} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function PageHeading({ eyebrow, title, description, children }) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow || 'WORKSPACE'}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="heading-actions">{children}</div>
    </div>
  );
}

export function PanelHeader({ title, note, to, link = 'View all', children }) {
  return (
    <div className="panel-heading">
      <div>
        <h2>{title}</h2>
        {note && <p>{note}</p>}
      </div>
      {to ? (
        <Link className="text-link" to={to}>
          {link}
          <Icon name="arrow" size={16} />
        </Link>
      ) : (
        children
      )}
    </div>
  );
}

export function ProjectTable({ projects, compact = false }) {
  if (!projects.length)
    return (
      <Empty
        title="No projects here yet."
        description="Create a project to bring the next piece of work into focus."
      />
    );
  return (
    <div className="table-scroll">
      <table className="project-table">
        <thead>
          <tr>
            <th>Project</th>
            <th>Status</th>
            <th>Progress</th>
            {!compact && <th>Owner</th>}
            <th>Due date</th>
            <th>
              <span className="sr-only">Open</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <tr key={project.id}>
              <td>
                <Link to={`/projects/${project.id}`} className="project-name">
                  <span className="project-symbol" style={{ '--project': project.color }}>
                    <Icon name="projects" size={19} />
                  </span>
                  <span>
                    <strong>{project.name}</strong>
                    <small>{project.client}</small>
                  </span>
                </Link>
              </td>
              <td>
                <Status value={project.archived ? 'archived' : project.status} />
              </td>
              <td>
                <Progress value={project.progress} />
              </td>
              {!compact && (
                <td>
                  <span className="person-inline">
                    <Avatar user={project.owner_detail} small />
                    <span>{project.owner_detail?.name}</span>
                  </span>
                </td>
              )}
              <td className="date-cell">{dateLabel(project.due_date)}</td>
              <td>
                <Link
                  className="icon-button"
                  to={`/projects/${project.id}`}
                  aria-label={`Open ${project.name}`}
                >
                  <Icon name="chevron" size={16} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TaskTable({ tasks, compact = false }) {
  if (!tasks.length) return <Empty />;
  return (
    <div className="table-scroll">
      <table className="task-table">
        <thead>
          <tr>
            <th>Task</th>
            {!compact && <th>Project</th>}
            <th>Status</th>
            <th>Priority</th>
            <th>Assignee</th>
            <th>Due date</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id}>
              <td>
                <Link className="task-name" to={`/tasks/${task.id}`}>
                  <span className={`task-check ${task.status === 'done' ? 'checked' : ''}`}>
                    {task.status === 'done' && <Icon name="check" size={12} />}
                  </span>
                  <span>
                    <small className="mono">
                      {task.project_code}-{String(task.id).padStart(3, '0')}
                    </small>
                    <strong>{task.title}</strong>
                  </span>
                </Link>
              </td>
              {!compact && (
                <td>
                  <Link className="subtle-link" to={`/projects/${task.project}`}>
                    {task.project_name}
                  </Link>
                </td>
              )}
              <td>
                <Status value={task.status} />
              </td>
              <td>
                <Priority value={task.priority} />
              </td>
              <td>
                <span className="person-inline">
                  <Avatar user={task.assignee_detail} small />
                  <span>{task.assignee_detail?.name?.split(' ')[0] || 'Unassigned'}</span>
                </span>
              </td>
              <td className={`date-cell ${isOverdue(task) ? 'overdue' : ''}`}>
                {isOverdue(task) && <Icon name="alert" size={13} />} {dateLabel(task.due_date)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Modal({ title, description, children, close, wide = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={wide ? 'wide' : ''}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      aria-labelledby="modal-title"
    >
      <div className="modal-content">
        <div className="modal-heading">
          <div>
            <div className="eyebrow">OPSBOARD / WORKSPACE</div>
            <h2 id="modal-title">{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button className="icon-button" onClick={close} aria-label="Close dialog">
            <Icon name="close" />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}

export function FlowChart({ data, height = 175 }) {
  const [hovered, setHovered] = useState(null);
  const max = Math.max(...data.flatMap((point) => [point.completed, point.created]), 4);
  const width = 660;
  const plotHeight = height - 35;
  const gap = (width - 42) / data.length;
  return (
    <div className="flow-chart">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="group"
        aria-label={`Task flow over ${data.length} days. ${data.reduce((total, point) => total + point.completed, 0)} tasks completed.`}
      >
        {[0, 0.5, 1].map((portion) => (
          <g key={portion}>
            <line
              x1="27"
              x2={width}
              y1={plotHeight - portion * (plotHeight - 10)}
              y2={plotHeight - portion * (plotHeight - 10)}
              stroke="#e8eceb"
              strokeDasharray="3 4"
            />
            <text x="3" y={plotHeight - portion * (plotHeight - 10) + 4} fill="#77827f" fontSize="10">
              {Math.round(max * portion)}
            </text>
          </g>
        ))}
        {data.map((point, index) => (
          <g
            key={point.date}
            role="img"
            tabIndex="0"
            aria-label={`${dateLabel(point.date)}: ${point.completed} completed, ${point.created} created`}
            onMouseEnter={() => setHovered(index)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(index)}
            onBlur={() => setHovered(null)}
          >
            <rect
              x={34 + index * gap}
              y={plotHeight - (point.created / max) * (plotHeight - 10)}
              width={gap * 0.27}
              height={Math.max(2, (point.created / max) * (plotHeight - 10))}
              fill="#d9e5df"
              rx="2"
            />
            <rect
              x={34 + index * gap + gap * 0.31}
              y={plotHeight - (point.completed / max) * (plotHeight - 10)}
              width={gap * 0.27}
              height={Math.max(2, (point.completed / max) * (plotHeight - 10))}
              fill={hovered === index ? '#123d35' : '#368873'}
              rx="2"
            />
            {(index === 0 ||
              index === data.length - 1 ||
              (data.length > 7 ? index % 4 === 0 : index % 2 === 0)) && (
              <text x={34 + index * gap} y={height - 12} fill="#77827f" fontSize="10">
                {dateLabel(point.date)}
              </text>
            )}
          </g>
        ))}
      </svg>
      <div className="chart-caption" aria-live="polite">
        {hovered !== null
          ? `${dateLabel(data[hovered].date)} · ${data[hovered].completed} completed · ${data[hovered].created} created`
          : 'Hover or focus a column to inspect the day.'}
      </div>
    </div>
  );
}

export function Workload({ users, compact = false }) {
  return (
    <div className={`workload-list ${compact ? 'compact' : ''}`}>
      {users.map((user) => (
        <div className="workload-item" key={user.id}>
          <Avatar user={user} small />
          <div className="workload-info">
            <div>
              <strong>{user.name}</strong>
              <span className="mono">
                {user.assigned_hours}
                <small> / {user.capacity_hours}h</small>
              </span>
            </div>
            <div className="workload-track">
              <span
                style={{
                  width: `${Math.min(user.utilization, 100)}%`,
                  background: user.utilization > 100 ? '#c08243' : user.color,
                }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ActivityList({ items, compact = false }) {
  if (!items.length)
    return (
      <Empty
        title="The log starts here."
        description="Project and task changes will appear in this shared timeline."
      />
    );
  return (
    <div className={`activity-list ${compact ? 'compact' : ''}`}>
      {items.map((activity) => (
        <div className="activity-item" key={activity.id}>
          <Avatar user={activity.actor} small />
          <div>
            <p>
              <strong>{activity.actor?.name || 'Former teammate'}</strong> {activity.message}
            </p>
            <time dateTime={activity.created_at}>
              {dateLabel(activity.created_at)} ·{' '}
              {new Date(activity.created_at).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })}
            </time>
          </div>
        </div>
      ))}
    </div>
  );
}
