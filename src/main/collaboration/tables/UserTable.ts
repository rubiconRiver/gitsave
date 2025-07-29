import { BaseTable } from './BaseTable';
import { UserProfile } from '../types/User';

/**
 * USER TABLE - Team member profiles and status
 * 
 * This manages user profiles, online status, and presence.
 * Each user controls their own profile data.
 * 
 * USAGE:
 * - Update status: await users.updateStatus('busy', 'In a meeting')
 * - Set working hours: await users.setWorkingHours('09:00', '17:00')
 * - Get online users: const online = await users.getOnline()
 * 
 * STATUS OPTIONS:
 * - online: Actively working
 * - away: Temporarily away
 * - busy: Do not disturb
 * - offline: Not available
 */
export class UserTable extends BaseTable<UserProfile> {
  
  /**
   * Update current user's profile
   */
  async updateProfile(updates: Partial<UserProfile>): Promise<void> {
    const profile = await this.getMyProfile();
    
    const updatedProfile: UserProfile = {
      ...profile,
      ...updates,
      updatedAt: this.now(),
      lastSeen: this.now()
    };
    
    await this.save('profile', updatedProfile);
  }
  
  /**
   * Get current user's profile
   */
  async getMyProfile(): Promise<UserProfile> {
    const myData = this.store.getMyData();
    const username = this.store.getCurrentUsername();
    
    // Return existing or create default
    return myData.profile || {
      id: this.generateId(),
      username,
      email: '',
      displayName: username,
      status: 'online',
      lastSeen: this.now(),
      createdAt: this.now(),
      updatedAt: this.now()
    };
  }
  
  /**
   * Update status quickly
   */
  async updateStatus(
    status: 'online' | 'away' | 'offline' | 'busy',
    message?: string
  ): Promise<void> {
    await this.updateProfile({
      status,
      statusMessage: message,
      lastSeen: this.now()
    });
  }
  
  /**
   * Get all user profiles
   */
  async getAllProfiles(): Promise<UserProfile[]> {
    const profiles: UserProfile[] = [];
    
    this.store.getAllUsernames().forEach(username => {
      const userData = this.store.getUserData(username);
      if (userData.profile) {
        profiles.push(userData.profile);
      }
    });
    
    return profiles;
  }
  
  /**
   * Get online users
   */
  async getOnline(): Promise<UserProfile[]> {
    const profiles = await this.getAllProfiles();
    
    // Consider someone online if they were seen in last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    return profiles.filter(p => {
      const lastSeen = new Date(p.lastSeen);
      return p.status === 'online' && lastSeen > fiveMinutesAgo;
    });
  }
  
  /**
   * Get user by username
   */
  async getByUsername(username: string): Promise<UserProfile | null> {
    const userData = this.store.getUserData(username);
    return userData.profile || null;
  }
  
  /**
   * Set working hours
   */
  async setWorkingHours(
    start: string,
    end: string,
    days: number[] = [1, 2, 3, 4, 5] // Mon-Fri by default
  ): Promise<void> {
    await this.updateProfile({
      workingHours: { start, end, days }
    });
  }
  
  /**
   * Check if user is within working hours
   */
  async isWorkingHours(username: string): Promise<boolean> {
    const profile = await this.getByUsername(username);
    if (!profile || !profile.workingHours) return true; // Assume available if not set
    
    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = now.getHours() * 100 + now.getMinutes();
    
    // Check if today is a working day
    if (!profile.workingHours.days.includes(currentDay)) {
      return false;
    }
    
    // Check if current time is within working hours
    const [startHour, startMin] = profile.workingHours.start.split(':').map(Number);
    const [endHour, endMin] = profile.workingHours.end.split(':').map(Number);
    
    const startTime = startHour * 100 + startMin;
    const endTime = endHour * 100 + endMin;
    
    return currentTime >= startTime && currentTime <= endTime;
  }
  
  /**
   * Update last seen timestamp
   */
  async updateLastSeen(): Promise<void> {
    await this.updateProfile({
      lastSeen: this.now()
    });
  }
}