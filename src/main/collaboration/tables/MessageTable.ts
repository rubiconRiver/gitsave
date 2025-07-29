import { BaseTable } from './BaseTable';
import { Message, MessageThread } from '../types/Message';

/**
 * MESSAGE TABLE - Handles all messaging functionality
 * 
 * This table manages messages between team members.
 * Messages are stored in each user's outbox, and we read
 * from all outboxes to build conversations.
 * 
 * USAGE:
 * - Send a message: await messages.send('partner', 'Hello!')
 * - Get inbox: const myMessages = await messages.getInbox()
 * - Get conversation: const thread = await messages.getConversation('partner')
 * 
 * HOW IT WORKS:
 * - Each user has an outbox with messages they've sent
 * - To get your inbox, we scan all other users' outboxes
 * - Messages are never deleted, only marked as read
 */
export class MessageTable extends BaseTable<Message> {
  
  /**
   * Send a message to another user
   */
  async send(to: string, text: string, threadId?: string): Promise<Message> {
    const message: Message = {
      id: this.generateId(),
      userId: this.store.getCurrentUsername(),
      from: this.store.getCurrentUsername(),
      to,
      text,
      threadId: threadId || this.generateThreadId(to),
      read: false,
      timestamp: this.now(),
      createdAt: this.now(),
      updatedAt: this.now()
    };
    
    // Get current outbox
    const myData = this.store.getMyData();
    const outbox = myData.messages?.outbox || [];
    
    // Add message
    outbox.push(message);
    
    // Save
    await this.save('messages', {
      outbox,
      drafts: myData.messages?.drafts || []
    });
    
    return message;
  }
  
  /**
   * Get all messages sent to the current user
   */
  async getInbox(): Promise<Message[]> {
    const myUsername = this.store.getCurrentUsername();
    const inbox: Message[] = [];
    
    // Look through all users' outboxes
    this.store.getAllUsernames().forEach(username => {
      if (username === myUsername) return;
      
      const userData = this.store.getUserData(username);
      const outbox = userData.messages?.outbox || [];
      
      // Find messages sent to me
      const messagesForMe = outbox.filter((msg: Message) => msg.to === myUsername);
      inbox.push(...messagesForMe);
    });
    
    // Sort by timestamp (newest first)
    return inbox.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }
  
  /**
   * Get conversation with a specific user
   */
  async getConversation(withUser: string): Promise<Message[]> {
    const myUsername = this.store.getCurrentUsername();
    const messages: Message[] = [];
    
    // Get messages I sent to them
    const myData = this.store.getMyData();
    const mySent = (myData.messages?.outbox || [])
      .filter((msg: Message) => msg.to === withUser);
    messages.push(...mySent);
    
    // Get messages they sent to me
    const theirData = this.store.getUserData(withUser);
    const theirSent = (theirData.messages?.outbox || [])
      .filter((msg: Message) => msg.to === myUsername);
    messages.push(...theirSent);
    
    // Sort by timestamp (oldest first for conversation view)
    return messages.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }
  
  /**
   * Mark messages as read
   */
  async markAsRead(messageIds: string[]): Promise<void> {
    // Since messages are stored in sender's outbox,
    // we need to update read status across all users
    let hasChanges = false;
    const updates: Record<string, any> = {};
    
    this.store.getAllUsernames().forEach(username => {
      const userData = this.store.getUserData(username);
      const outbox = userData.messages?.outbox || [];
      
      let userHasChanges = false;
      outbox.forEach((msg: Message) => {
        if (messageIds.includes(msg.id) && !msg.read) {
          msg.read = true;
          msg.updatedAt = this.now();
          userHasChanges = true;
        }
      });
      
      if (userHasChanges) {
        updates[username] = {
          messages: {
            outbox,
            drafts: userData.messages?.drafts || []
          }
        };
        hasChanges = true;
      }
    });
    
    // Save all updates
    if (hasChanges) {
      await this.store.saveMultipleUserData(updates);
    }
  }
  
  /**
   * Get unread count
   */
  async getUnreadCount(): Promise<number> {
    const inbox = await this.getInbox();
    return inbox.filter(msg => !msg.read).length;
  }
  
  /**
   * Generate a thread ID for a conversation
   */
  private generateThreadId(withUser: string): string {
    const users = [this.store.getCurrentUsername(), withUser].sort();
    return `thread-${users.join('-')}`;
  }
}