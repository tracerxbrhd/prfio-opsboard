import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from './api';
import {
  ActivityList,
  Avatar,
  Empty,
  FlowChart,
  Modal,
  PageHeading,
  PanelHeader,
  Priority,
  Progress,
  ProjectTable,
  Status,
  TaskTable,
  Workload,
} from './components';
import { Icon } from './icons';
import {
  dateLabel,
  downloadCSV,
  isOverdue,
  priorities,
  statuses,
  taskStatuses,
  useWorkspace,
} from './workspace';

function NewButton({ kind = 'task', project }) {
  const { canManage, edit } = useWorkspace();
  if (!canManage) return null;
  return (
    <button className="button primary" onClick={() => edit({ kind, project })}>
      <Icon name="plus" size={17} />
      New {kind}
    </button>
  );
}

function ExportButton({ tasks }) {
  return (
    <button className="button secondary" onClick={() => downloadCSV(tasks)}>
      <Icon name="download" size={16} />
      <span>Export work</span>
    </button>
  );
}

function Metric({ label, value, icon, note, to, tone }) {
  return (
    <Link className={`metric ${tone || ''}`} to={to}>
      <div className="metric-label">
        {label}
        <span>
          <Icon name={icon} size={19} />
        </span>
      </div>
      <strong>{String(value).padStart(2, '0')}</strong>
      <div className="metric-note">
        {note}
        <Icon name="arrow" size={15} />
      </div>
    </Link>
  );
}

export function Dashboard() {
  const { data, user } = useWorkspace();
  const stats = data.analytics;
  const projects = data.projects.filter((project) => !project.archived && project.status !== 'completed');
  const activeTasks = data.tasks.filter((task) => !task.project_archived);
  return (
    <>
      <PageHeading
        eyebrow={new Date()
          .toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })
          .toUpperCase()}
        title={`Good to see you, ${user.name.split(' ')[0]}.`}
        description="Here’s the shape of your team’s work today."
      >
        <ExportButton tasks={activeTasks} />
        <NewButton />
      </PageHeading>
      <div className="delivery-pulse">
        <div className="pulse-icon">
          <Icon name="activity" size={20} />
        </div>
        <span>
          <strong>Keep the momentum.</strong> {stats.due_this_week} tasks are due in the next 7 days.
          {stats.overdue_tasks > 0 && ` ${stats.overdue_tasks} need a closer look.`}
        </span>
        <Link to="/tasks?filter=overdue">
          Review priorities
          <Icon name="arrow" size={16} />
        </Link>
      </div>
      <div className="metrics-grid">
        <Metric
          label="Active projects"
          value={stats.active_projects}
          icon="projects"
          note="Across your workspace"
          to="/projects"
        />
        <Metric
          label="Tasks completed"
          value={stats.completed_tasks}
          icon="check"
          note={`${stats.completed_in_period} completed in the last 14 days`}
          to="/tasks?status=done"
          tone="green"
        />
        <Metric
          label="Overdue tasks"
          value={stats.overdue_tasks}
          icon="clock"
          note="Ready for your attention"
          to="/tasks?filter=overdue"
          tone="amber"
        />
        <Metric
          label="Team members"
          value={data.team.length}
          icon="team"
          note={`${data.team.reduce((sum, person) => sum + person.assigned_hours, 0)}h of open work assigned`}
          to="/team"
        />
      </div>
      <div className="dashboard-grid">
        <section className="panel projects-panel">
          <PanelHeader
            title="Projects in motion"
            note={`${projects.length} active workstreams · a shared destination`}
            to="/projects"
          />
          <ProjectTable projects={projects.slice(0, 5)} compact />
          <div className="panel-foot">
            <span className="live-dot" />
            Progress follows completed tasks, in real time.
          </div>
        </section>
        <section className="panel">
          <PanelHeader title="Team capacity" note="Open effort / weekly capacity" to="/team" link="Team" />
          <Workload users={data.team} compact />
          <div className="panel-foot">A planning signal, across all open deadlines.</div>
        </section>
        <section className="panel">
          <PanelHeader
            title="Delivery rhythm"
            note="Tasks created and completed · last 14 days"
            to="/analytics"
            link="Analytics"
          />
          <div className="chart-legend">
            <span>
              <i className="created" />
              Created
            </span>
            <span>
              <i />
              Completed
            </span>
          </div>
          <div className="chart-inset">
            <FlowChart data={stats.series} height={185} />
          </div>
        </section>
        <section className="panel">
          <PanelHeader
            title="The latest"
            note="Small steps, shared progress"
            to="/activity"
            link="Activity"
          />
          <ActivityList items={data.activity.slice(0, 3)} compact />
        </section>
      </div>
      <div className="overview-bottom">
        <span className="eyebrow">FOCUS, THEN FORWARD.</span>
        <span>Everything here reflects your live workspace.</span>
      </div>
    </>
  );
}

export function ProjectsPage() {
  const { data } = useWorkspace();
  const [tab, setTab] = useState('active');
  const [search, setSearch] = useState('');
  const projects = data.projects.filter(
    (project) =>
      (tab === 'archived' ? project.archived : !project.archived) &&
      `${project.name} ${project.code} ${project.client}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      <PageHeading
        eyebrow="PLAN / DELIVER / REVIEW"
        title="Projects"
        description="Clear ownership. Visible progress. Room for the next move."
      >
        <NewButton kind="project" />
      </PageHeading>
      <div className="project-summary-strip">
        <span>
          <strong>{data.projects.filter((project) => !project.archived).length}</strong> live projects
        </span>
        <span>
          <i className="dot green" />
          {data.projects.filter((project) => !project.archived && project.status === 'active').length} on
          track
        </span>
        <span>
          <i className="dot amber" />
          {data.projects.filter((project) => !project.archived && project.status === 'at_risk').length} need
          attention
        </span>
        <span>
          <i className="dot gray" />
          {data.projects.filter((project) => !project.archived && project.status === 'completed').length}{' '}
          completed
        </span>
      </div>
      <section className="panel">
        <div className="toolbar">
          <div className="tabs" aria-label="Project view">
            {['active', 'archived'].map((value) => (
              <button
                key={value}
                className={tab === value ? 'selected' : ''}
                onClick={() => setTab(value)}
                aria-pressed={tab === value}
              >
                {value === 'active' ? 'All projects' : 'Archived'}
                <span>
                  {
                    data.projects.filter((project) =>
                      value === 'active' ? !project.archived : project.archived,
                    ).length
                  }
                </span>
              </button>
            ))}
          </div>
          <div className="search-field">
            <Icon name="search" size={16} />
            <input
              aria-label="Search projects"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Find a project…"
            />
          </div>
        </div>
        <ProjectTable projects={projects} />
        <div className="panel-foot">
          {projects.length} project{projects.length === 1 ? '' : 's'} · ordered by target date
        </div>
      </section>
      <div className="insight-note">
        <Icon name="projects" size={24} />
        <div>
          <strong>A home for every workstream.</strong>
          <p>Open a project to see its brief, owner, tasks, and delivery progress in one place.</p>
        </div>
      </div>
    </>
  );
}

function ConfirmDelete({ label, description, close, onConfirm }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function confirm() {
    setBusy(true);
    try {
      await onConfirm();
      close();
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={`Delete ${label}?`} description={description} close={close}>
      <p className="delete-note">This permanently removes the record. This action cannot be undone.</p>
      {error && (
        <p role="alert" className="error-banner">
          {error}
        </p>
      )}
      <div className="modal-footer">
        <button className="button secondary" onClick={close} disabled={busy}>
          Keep it
        </button>
        <button className="button danger" onClick={confirm} disabled={busy}>
          {busy ? 'Deleting…' : 'Delete permanently'}
        </button>
      </div>
    </Modal>
  );
}

export function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, user, canManage, edit, reload, notify } = useWorkspace();
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState('tasks');
  const project = data.projects.find((item) => item.id === Number(id));
  if (!project)
    return (
      <Empty
        title="Project not found."
        description="It may have been removed from this workspace."
        action={
          <Link className="button primary" to="/projects">
            Back to projects
          </Link>
        }
      />
    );
  const tasks = data.tasks.filter((task) => task.project === project.id);
  async function archive() {
    setBusy(true);
    try {
      await api(`projects/${id}/archive/`, { method: 'POST', body: { archived: !project.archived } });
      await reload();
      notify(project.archived ? 'Project restored.' : 'Project archived.');
    } catch (error) {
      notify(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Link className="back-link" to="/projects">
        ← All projects
      </Link>
      <PageHeading
        eyebrow={`${project.code} / ${project.client}`}
        title={project.name}
        description={
          project.archived
            ? 'Archived workstream · restore to continue delivery.'
            : 'One shared picture of the path to delivery.'
        }
      >
        {canManage && (
          <>
            <button className="button secondary" onClick={() => edit({ kind: 'project', record: project })}>
              <Icon name="edit" size={16} />
              Edit project
            </button>
            <button className="button secondary" onClick={archive} disabled={busy}>
              <Icon name="archive" size={16} />
              {busy ? 'Saving…' : project.archived ? 'Restore' : 'Archive'}
            </button>
          </>
        )}
      </PageHeading>
      <div className="project-detail-grid">
        <section className="panel project-brief">
          <div className="eyebrow">PROJECT BRIEF</div>
          <h2>The destination</h2>
          <p>{project.description || 'No brief has been added to this project yet.'}</p>
          <div className="brief-bottom">
            <Status value={project.archived ? 'archived' : project.status} />
            <span className="mono">{project.code}</span>
          </div>
        </section>
        <section className="panel project-facts">
          <div>
            <span>Project owner</span>
            <strong className="person-inline">
              <Avatar user={project.owner_detail} small />
              {project.owner_detail?.name}
            </strong>
          </div>
          <div>
            <span>Target date</span>
            <strong>
              <Icon name="calendar" size={16} />
              {dateLabel(project.due_date, { year: 'numeric' })}
            </strong>
          </div>
          <div>
            <span>Delivery progress</span>
            <Progress value={project.progress} />
          </div>
          <div>
            <span>Tasks completed</span>
            <strong className="mono">
              {project.completed_tasks} / {project.total_tasks}
            </strong>
          </div>
        </section>
      </div>
      <section className="panel">
        <div className="toolbar">
          <div className="tabs">
            <button
              onClick={() => setTab('tasks')}
              className={tab === 'tasks' ? 'selected' : ''}
              aria-pressed={tab === 'tasks'}
            >
              Project tasks<span>{tasks.length}</span>
            </button>
            <button
              onClick={() => setTab('activity')}
              className={tab === 'activity' ? 'selected' : ''}
              aria-pressed={tab === 'activity'}
            >
              Activity
            </button>
          </div>
          {!project.archived && <NewButton project={project} />}
        </div>
        {tab === 'tasks' ? (
          <TaskTable tasks={tasks} compact />
        ) : (
          <ActivityList items={data.activity.filter((activity) => activity.project === project.id)} />
        )}
      </section>
      {user.role === 'admin' && (
        <div className="danger-zone">
          <span>Project administration</span>
          <button className="text-link danger-text" onClick={() => setDeleting(true)}>
            <Icon name="trash" size={15} />
            Delete project
          </button>
        </div>
      )}
      {deleting && (
        <ConfirmDelete
          label="this project"
          description={`“${project.name}” and all ${tasks.length} associated tasks will be removed.`}
          close={() => setDeleting(false)}
          onConfirm={async () => {
            await api(`projects/${id}/`, { method: 'DELETE' });
            await reload();
            navigate('/projects');
            notify('Project deleted.');
          }}
        />
      )}
    </>
  );
}

export function TasksPage() {
  const { data, user } = useWorkspace();
  const [params, setParams] = useSearchParams();
  const [sort, setSort] = useState('date');
  const search = params.get('q') || '';
  const filter = params.get('filter') || 'all';
  const status = params.get('status') || '';
  const project = params.get('project') || '';
  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };
  const active = data.tasks.filter((task) => !task.project_archived);
  const tasks = active
    .filter(
      (task) =>
        (!status || task.status === status) &&
        (!project || task.project === Number(project)) &&
        (filter !== 'mine' || task.assignee === user.id) &&
        (filter !== 'overdue' || isOverdue(task)) &&
        `${task.title} ${task.project_name} ${task.tags.join(' ')} ${task.project_code}-${String(task.id).padStart(3, '0')}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a, b) =>
      sort === 'priority'
        ? priorities.indexOf(b.priority) - priorities.indexOf(a.priority)
        : sort === 'title'
          ? a.title.localeCompare(b.title)
          : a.due_date.localeCompare(b.due_date),
    );
  return (
    <>
      <PageHeading
        eyebrow="THE NEXT CLEAR STEP"
        title="Tasks"
        description="The details that turn a plan into progress."
      >
        <ExportButton tasks={tasks} />
        <NewButton />
      </PageHeading>
      <section className="panel">
        <div className="toolbar">
          <div className="tabs">
            {[
              ['all', 'All work', active.length],
              ['mine', 'My tasks', active.filter((task) => task.assignee === user.id).length],
              ['overdue', 'Overdue', active.filter(isOverdue).length],
            ].map(([value, label, count]) => (
              <button
                key={value}
                className={filter === value ? 'selected' : ''}
                onClick={() => setParam('filter', value === 'all' ? '' : value)}
                aria-pressed={filter === value}
              >
                {label}
                <span>{count}</span>
              </button>
            ))}
          </div>
          <div className="search-field">
            <Icon name="search" size={16} />
            <input
              aria-label="Search tasks"
              placeholder="Search tasks or tags…"
              value={search}
              onChange={(event) => setParam('q', event.target.value)}
            />
          </div>
        </div>
        <div className="filter-row">
          <select
            aria-label="Filter by status"
            value={status}
            onChange={(event) => setParam('status', event.target.value)}
          >
            <option value="">All statuses</option>
            {taskStatuses.map((value) => (
              <option key={value} value={value}>
                {statuses[value]}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by project"
            value={project}
            onChange={(event) => setParam('project', event.target.value)}
          >
            <option value="">All projects</option>
            {data.projects
              .filter((item) => !item.archived)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
          </select>
          <select aria-label="Sort tasks" value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="date">Due date: earliest first</option>
            <option value="priority">Priority: highest first</option>
            <option value="title">Title: A–Z</option>
          </select>
          {(search || status || project || filter !== 'all') && (
            <button className="text-link" onClick={() => setParams({})}>
              Clear filters
            </button>
          )}
          <span>{tasks.length} tasks</span>
        </div>
        <TaskTable tasks={tasks} />
        <div className="panel-foot">
          {tasks.length} of {active.length} workspace tasks · archived projects excluded
        </div>
      </section>
    </>
  );
}

export function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, user, canManage, edit, reload, notify } = useWorkspace();
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const task = data.tasks.find((item) => item.id === Number(id));
  if (!task)
    return (
      <Empty
        title="Task not found."
        description="It may have been removed from this workspace."
        action={
          <Link className="button primary" to="/tasks">
            Back to tasks
          </Link>
        }
      />
    );
  const canUpdate = !task.project_archived && (canManage || task.assignee === user.id);
  async function changeStatus(event) {
    setBusy(true);
    try {
      await api(`tasks/${id}/`, { method: 'PATCH', body: { status: event.target.value } });
      await reload();
      notify('Task status updated.');
    } catch (error) {
      notify(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Link className="back-link" to="/tasks">
        ← All tasks
      </Link>
      <PageHeading
        eyebrow={`${task.project_code}-${String(task.id).padStart(3, '0')} / TASK DETAIL`}
        title={task.title}
        description={`Part of ${task.project_name}`}
      >
        {canManage && !task.project_archived && (
          <button className="button primary" onClick={() => edit({ kind: 'task', record: task })}>
            <Icon name="edit" size={16} />
            Edit task
          </button>
        )}
      </PageHeading>
      {task.project_archived && (
        <div className="delivery-pulse">
          <Icon name="archive" size={20} />
          This task belongs to an archived project. Restore the project to make changes.
        </div>
      )}
      <div className="task-detail-grid">
        <section className="panel task-description">
          <div className="task-detail-top">
            <Status value={task.status} />
            <span className="mono">
              {task.project_code}-{String(task.id).padStart(3, '0')}
            </span>
          </div>
          <h2>What needs to happen</h2>
          <p className="preserve-lines">
            {task.description || 'No additional description. The task title describes the next step.'}
          </p>
          <div className="task-tags">
            {task.tags.length ? (
              task.tags.map((tag) => (
                <Link to={`/tasks?q=${encodeURIComponent(tag)}`} className="tag" key={tag}>
                  #{tag}
                </Link>
              ))
            ) : (
              <span className="muted">No tags assigned</span>
            )}
          </div>
          <div className="task-history">
            <Icon name="clock" size={16} />
            <span>
              Created {dateLabel(task.created_at)} · Last updated {dateLabel(task.updated_at)}
              {task.completed_at && ` · Completed ${dateLabel(task.completed_at)}`}
            </span>
          </div>
        </section>
        <aside className="panel task-properties">
          <PanelHeader title="Task properties" />
          <dl>
            <div>
              <dt>Status</dt>
              <dd>
                {canUpdate ? (
                  <select
                    aria-label="Task status"
                    value={task.status}
                    onChange={changeStatus}
                    disabled={busy}
                  >
                    {taskStatuses.map((value) => (
                      <option key={value} value={value}>
                        {statuses[value]}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Status value={task.status} />
                )}
              </dd>
            </div>
            <div>
              <dt>Assignee</dt>
              <dd className="person-inline">
                <Avatar user={task.assignee_detail} small />
                {task.assignee_detail?.name || 'Unassigned'}
              </dd>
            </div>
            <div>
              <dt>Priority</dt>
              <dd>
                <Priority value={task.priority} />
              </dd>
            </div>
            <div>
              <dt>Deadline</dt>
              <dd className={isOverdue(task) ? 'overdue' : ''}>
                <Icon name="calendar" size={16} />
                {dateLabel(task.due_date, { year: 'numeric' })}
              </dd>
            </div>
            <div>
              <dt>Estimate</dt>
              <dd className="mono">{task.estimate_hours} hours</dd>
            </div>
            <div>
              <dt>Project</dt>
              <dd>
                <Link to={`/projects/${task.project}`} className="text-link">
                  {task.project_name}
                  <Icon name="arrow" size={15} />
                </Link>
              </dd>
            </div>
          </dl>
          {!canManage && (
            <div className="panel-foot">Members can update the status of their own assigned tasks.</div>
          )}
        </aside>
      </div>
      <section className="panel">
        <PanelHeader title="Project activity" note="The latest changes across this task’s workstream" />
        <ActivityList
          items={data.activity.filter((activity) => activity.project === task.project).slice(0, 5)}
          compact
        />
      </section>
      {canManage && !task.project_archived && (
        <div className="danger-zone">
          <span>Task administration</span>
          <button className="text-link danger-text" onClick={() => setDeleting(true)}>
            <Icon name="trash" size={15} />
            Delete task
          </button>
        </div>
      )}
      {deleting && (
        <ConfirmDelete
          label="this task"
          description={`“${task.title}” will be removed from ${task.project_name}.`}
          close={() => setDeleting(false)}
          onConfirm={async () => {
            await api(`tasks/${id}/`, { method: 'DELETE' });
            await reload();
            navigate('/tasks');
            notify('Task deleted.');
          }}
        />
      )}
    </>
  );
}

export function TeamPage() {
  const { data, user, reload, notify } = useWorkspace();
  const [pending, setPending] = useState(null);
  const total = data.team.reduce((sum, person) => sum + person.assigned_hours, 0);
  async function changeRole(person, role) {
    setPending(person.id);
    try {
      await api(`team/${person.id}/`, { method: 'PATCH', body: { role } });
      await reload();
      notify(`${person.name}'s role updated.`);
    } catch (error) {
      notify(error.message);
    } finally {
      setPending(null);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="PEOPLE, BEFORE PROCESS"
        title="The team"
        description="Know who’s carrying what. Make room where it’s needed."
      />
      <div className="team-summary">
        <div>
          <strong>{data.team.length}</strong>
          <span>people, one workspace</span>
        </div>
        <div>
          <strong>
            {total}
            <small>h</small>
          </strong>
          <span>estimated open effort</span>
        </div>
        <div>
          <strong>
            {data.team.reduce((sum, person) => sum + person.capacity_hours, 0)}
            <small>h</small>
          </strong>
          <span>weekly capacity benchmark</span>
        </div>
        <div className="team-summary-note">
          <Icon name="team" size={28} />
          <p>
            Capacity is a conversation.
            <br />
            Use the numbers to start it.
          </p>
        </div>
      </div>
      <div className="team-grid">
        {data.team.map((person) => (
          <article className="panel team-card" key={person.id}>
            <div className="team-card-top">
              <Avatar user={person} />
              <span className="role-label">{person.role}</span>
            </div>
            <h2>
              {person.name}
              {person.id === user.id && <small>you</small>}
            </h2>
            <p>{person.job_title}</p>
            <a href={`mailto:${person.email}`} className="team-email">
              {person.email}
            </a>
            <div className="team-work-metrics">
              <div>
                <strong>{person.open_tasks}</strong>
                <span>open tasks</span>
              </div>
              <div>
                <strong>{person.completed_tasks}</strong>
                <span>completed</span>
              </div>
              <div>
                <strong>
                  {person.assigned_hours}
                  <small>h</small>
                </strong>
                <span>open effort</span>
              </div>
            </div>
            <div className="capacity-label">
              <span>Open effort / capacity</span>
              <strong className={person.utilization > 100 ? 'overdue' : ''}>{person.utilization}%</strong>
            </div>
            <div className="workload-track">
              <span
                style={{
                  width: `${Math.min(person.utilization, 100)}%`,
                  background: person.utilization > 100 ? '#ba824a' : person.color,
                }}
              />
            </div>
            <div className="team-card-bottom">
              <span>{person.capacity_hours}h weekly benchmark</span>
              {user.role === 'admin' && person.id !== user.id && !person.role_locked ? (
                <select
                  aria-label={`Role for ${person.name}`}
                  value={person.role}
                  disabled={pending === person.id}
                  onChange={(event) => changeRole(person, event.target.value)}
                >
                  {['admin', 'manager', 'member'].map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              ) : (
                <Icon name="shield" size={15} />
              )}
            </div>
          </article>
        ))}
      </div>
      <div className="insight-note">
        <Icon name="shield" size={23} />
        <div>
          <strong>Right-sized access.</strong>
          <p>
            Admins manage the workspace and roles. Managers organize projects and tasks. Members move their
            assigned tasks forward. Accounts are provisioned through Django administration.
          </p>
        </div>
      </div>
    </>
  );
}

const statusColors = ['#dfe7e2', '#2e7b6c', '#cbab69', '#172f34'];
function StatusChart({ items }) {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  let cursor = 0;
  const stops = items.map((item, index) => {
    const start = cursor;
    cursor += total ? (item.count / total) * 100 : 0;
    return `${statusColors[index]} ${start}% ${cursor}%`;
  });
  return (
    <div className="status-chart-wrap">
      <div
        className="status-donut"
        style={{ background: `conic-gradient(${total ? stops.join(',') : '#e9eeeb 0% 100%'})` }}
        role="img"
        aria-label={`${total} tasks: ${items.map((item) => `${item.count} ${item.label}`).join(', ')}`}
      >
        <div>
          <strong>{total}</strong>
          <span>total tasks</span>
        </div>
      </div>
      <div className="status-legend">
        {items.map((item, index) => (
          <div key={item.status}>
            <i style={{ background: statusColors[index] }} />
            <span>{item.label}</span>
            <strong className="mono">{item.count}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AnalyticsPage() {
  const { data, notify } = useWorkspace();
  const [days, setDays] = useState('14');
  const [analytics, setAnalytics] = useState(data.analytics);
  const [showData, setShowData] = useState(false);
  useEffect(() => {
    let active = true;
    api(`analytics/?days=${days}`)
      .then((result) => {
        if (active) setAnalytics(result);
      })
      .catch((error) => {
        if (active) notify(error.message);
      });
    return () => {
      active = false;
    };
  }, [days, data.analytics, notify]);
  const completion = analytics.total_tasks
    ? Math.round((analytics.completed_tasks / analytics.total_tasks) * 100)
    : 0;
  return (
    <>
      <PageHeading
        eyebrow="MAKE PROGRESS VISIBLE"
        title="Delivery insights"
        description="A measured view of the work, drawn from your live project data."
      >
        <label className="period-select">
          <Icon name="calendar" size={17} />
          <select
            aria-label="Analytics period"
            value={days}
            onChange={(event) => setDays(event.target.value)}
          >
            <option value="7">Last 7 days</option>
            <option value="14">Last 14 days</option>
            <option value="30">Last 30 days</option>
          </select>
        </label>
        <ExportButton tasks={data.tasks.filter((task) => !task.project_archived)} />
      </PageHeading>
      <div className="analytics-highlight">
        <div>
          <span className="eyebrow">DELIVERED IN THIS PERIOD</span>
          <strong>
            {analytics.completed_in_period}
            <small>tasks</small>
          </strong>
          <p>Completed over the last {analytics.period_days} days.</p>
        </div>
        <div>
          <span className="eyebrow">WORKSPACE COMPLETION</span>
          <strong>
            {completion}
            <small>%</small>
          </strong>
          <Progress value={completion} />
        </div>
        <div>
          <span className="eyebrow">ON THE HORIZON</span>
          <strong>
            {analytics.due_this_week}
            <small>tasks</small>
          </strong>
          <p>Due in the next seven days.</p>
        </div>
      </div>
      <div className="analytics-grid">
        <section className="panel">
          <PanelHeader
            title="Delivery rhythm"
            note={`Daily created and completed tasks · ${analytics.period_days} days`}
          >
            <button className="text-link" onClick={() => setShowData(!showData)}>
              {showData ? 'Show chart' : 'View data'}
            </button>
          </PanelHeader>
          <div className="chart-legend">
            <span>
              <i className="created" />
              Created
            </span>
            <span>
              <i />
              Completed
            </span>
          </div>
          {showData ? (
            <div className="table-scroll chart-data">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Created</th>
                    <th>Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.series.map((point) => (
                    <tr key={point.date}>
                      <td>{dateLabel(point.date)}</td>
                      <td>{point.created}</td>
                      <td>{point.completed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="chart-inset">
              <FlowChart data={analytics.series} height={230} />
            </div>
          )}
        </section>
        <section className="panel">
          <PanelHeader title="The shape of the work" note="Current task distribution" />
          <StatusChart items={analytics.statuses} />
        </section>
        <section className="panel">
          <PanelHeader
            title="Effort across the team"
            note="Estimated hours for all open tasks / weekly capacity benchmark"
            to="/team"
            link="Team"
          />
          <Workload users={analytics.workload} />
        </section>
        <section className="panel">
          <PanelHeader title="Priority distribution" note="Outstanding work, grouped by urgency" />
          <div className="priority-chart">
            {analytics.priorities.map((item) => (
              <div key={item.priority}>
                <div>
                  <Priority value={item.priority} />
                  <strong className="mono">{item.count}</strong>
                </div>
                <div className="priority-bar">
                  <span
                    className={item.priority}
                    style={{
                      width: `${(item.count / Math.max(...analytics.priorities.map((entry) => entry.count), 1)) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="panel-foot">Completed tasks are excluded from open effort and urgency.</div>
        </section>
      </div>
      <div className="insight-note">
        <Icon name="analytics" size={23} />
        <div>
          <strong>Know what the numbers mean.</strong>
          <p>
            All metrics exclude archived projects. A task counts as delivered on its latest completion date;
            reopening clears that date. Open effort is estimated work across all deadlines, compared with each
            teammate’s weekly capacity.
          </p>
        </div>
      </div>
    </>
  );
}

export function ActivityPage() {
  const { data } = useWorkspace();
  const [person, setPerson] = useState('');
  const items = data.activity.filter((item) => !person || item.actor?.id === Number(person));
  return (
    <>
      <PageHeading
        eyebrow="THE WORK, AS IT HAPPENS"
        title="Workspace activity"
        description="A shared record of decisions, changes, and delivery."
      />
      <section className="panel activity-page">
        <div className="toolbar">
          <div>
            <h2>Recent changes</h2>
            <p className="muted">The latest 100 workspace events.</p>
          </div>
          <select
            aria-label="Filter activity by teammate"
            value={person}
            onChange={(event) => setPerson(event.target.value)}
          >
            <option value="">Everyone</option>
            {data.team.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </div>
        <ActivityList items={items} />
      </section>
    </>
  );
}
