import { CollaborationTask, ProjectGoal, BuildInfo, CollaborationData } from './collaboration-types';

export class CollaborationManager {
  private container: HTMLElement;
  private currentUser: string;
  private currentEmail: string;
  
  constructor(container: HTMLElement) {
    this.container = container;
    this.currentUser = 'Unknown';
    this.currentEmail = '';
    this.initialize();
  }
  
  private async initialize() {
    // Load collaboration HTML
    const response = await fetch('../collaboration/collaboration.html');
    const html = await response.text();
    this.container.innerHTML = html;
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Load initial data
    this.loadMockData();
  }
  
  private setupEventListeners() {
    // Collapsible sections
    const headers = this.container.querySelectorAll('.collab-section-header');
    headers.forEach(header => {
      header.addEventListener('click', () => {
        header.classList.toggle('expanded');
      });
      // Start with all sections expanded
      header.classList.add('expanded');
    });
    
    // Refresh button
    const refreshBtn = this.container.querySelector('#collab-refresh');
    refreshBtn?.addEventListener('click', () => {
      this.refresh();
    });
    
    // Add task button
    const addTaskBtn = this.container.querySelector('#add-task-btn');
    addTaskBtn?.addEventListener('click', () => {
      this.showAddTaskDialog();
    });
  }
  
  private loadMockData() {
    // Mock goals
    const goals: ProjectGoal[] = [
      {
        id: '1',
        title: 'Launch v1.0 with full collaboration features',
        description: 'Complete the collaboration tools and prepare for public release',
        createdBy: 'Garett',
        createdAt: new Date().toISOString(),
        status: 'active'
      },
      {
        id: '2',
        title: 'Implement real-time sync using git branches',
        createdBy: 'Garett',
        createdAt: new Date().toISOString(),
        status: 'active'
      }
    ];
    
    // Mock tasks
    const myTasks: CollaborationTask[] = [
      {
        id: '1',
        title: 'Design logo for Intentional',
        assignee: 'Partner',
        assignedBy: 'Garett',
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        priority: 'high'
      }
    ];
    
    const teamTasks: CollaborationTask[] = [
      {
        id: '2',
        title: 'Test collaboration sync on Windows',
        assignee: 'Garett',
        assignedBy: 'Partner',
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    
    // Mock builds
    const builds: BuildInfo[] = [
      {
        id: '1',
        version: 'v0.8.0',
        branch: 'main',
        author: 'Garett',
        timestamp: new Date().toISOString(),
        status: 'success'
      }
    ];
    
    // Render the data
    this.renderGoals(goals);
    this.renderTasks(myTasks, teamTasks);
    this.renderBuilds(builds);
  }
  
  private renderGoals(goals: ProjectGoal[]) {
    const container = this.container.querySelector('#project-goals');
    if (!container) return;
    
    if (goals.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📌</div>No project goals set</div>';
      return;
    }
    
    container.innerHTML = goals.map(goal => `
      <div class="goal-item">
        <div class="goal-text">${this.escapeHtml(goal.title)}</div>
      </div>
    `).join('');
  }
  
  private renderTasks(myTasks: CollaborationTask[], teamTasks: CollaborationTask[]) {
    // Render my tasks
    const myContainer = this.container.querySelector('#my-tasks');
    const myCount = this.container.querySelector('#my-task-count');
    if (myContainer) {
      if (myTasks.length === 0) {
        myContainer.innerHTML = '<div class="empty-state"><div class="empty-state-icon">✅</div>No tasks assigned to you</div>';
      } else {
        myContainer.innerHTML = myTasks.map(task => this.renderTask(task, false)).join('');
      }
    }
    if (myCount && myTasks.length > 0) {
      myCount.textContent = myTasks.length.toString();
    }
    
    // Render team tasks
    const teamContainer = this.container.querySelector('#team-tasks');
    const teamCount = this.container.querySelector('#team-task-count');
    if (teamContainer) {
      if (teamTasks.length === 0) {
        teamContainer.innerHTML = '<div class="empty-state"><div class="empty-state-icon">👥</div>No team tasks</div>';
      } else {
        teamContainer.innerHTML = teamTasks.map(task => this.renderTask(task, true)).join('');
      }
    }
    if (teamCount && teamTasks.length > 0) {
      teamCount.textContent = teamTasks.length.toString();
    }
  }
  
  private renderTask(task: CollaborationTask, isTeamTask: boolean): string {
    const isForMe = task.assignee === this.currentUser;
    return `
      <div class="task-item">
        <div class="task-checkbox ${task.status === 'completed' ? 'checked' : ''}" data-task-id="${task.id}"></div>
        <div class="task-content">
          <div class="task-text">${this.escapeHtml(task.title)}</div>
          <div class="task-assignee ${isForMe ? 'for-me' : ''}">
            ${isTeamTask ? `For: ${task.assignee}` : `From: ${task.assignedBy}`}
          </div>
        </div>
      </div>
    `;
  }
  
  private renderBuilds(builds: BuildInfo[]) {
    const container = this.container.querySelector('#recent-builds');
    if (!container) return;
    
    if (builds.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🏗️</div>No recent builds</div>';
      return;
    }
    
    container.innerHTML = builds.map(build => `
      <div class="build-item">
        <div class="build-info">
          <div class="build-version">${this.escapeHtml(build.version)}</div>
          <div class="build-time">${this.formatTime(build.timestamp)} by ${build.author}</div>
        </div>
        <span class="build-status ${build.status}">${build.status}</span>
      </div>
    `).join('');
  }
  
  private formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) {
      const minutes = Math.floor(diff / (1000 * 60));
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else {
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    }
  }
  
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  private async refresh() {
    const refreshBtn = this.container.querySelector('#collab-refresh');
    if (refreshBtn) {
      refreshBtn.classList.add('spinning');
    }
    
    // TODO: Implement actual refresh logic with git show
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (refreshBtn) {
      refreshBtn.classList.remove('spinning');
    }
  }
  
  private showAddTaskDialog() {
    // TODO: Implement task creation dialog
    console.log('Add task dialog');
  }
  
  public setCurrentUser(username: string, email: string) {
    this.currentUser = username;
    this.currentEmail = email;
  }
}