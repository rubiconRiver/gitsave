import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';

export interface GitOperation {
  id: string;
  type: 'commit' | 'push' | 'pull' | 'write-collaboration' | 'read-collaboration';
  payload: any;
  priority: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

@Injectable()
export class GitQueueService {
  private queue: GitOperation[] = [];
  private isProcessing = false;
  private operationHandlers = new Map<string, (op: GitOperation) => Promise<any>>();
  
  constructor(private eventEmitter: EventEmitter2) {
    // Start processing queue
    this.startProcessing();
  }
  
  /**
   * Register an operation handler
   */
  registerHandler(type: string, handler: (op: GitOperation) => Promise<any>) {
    this.operationHandlers.set(type, handler);
  }
  
  /**
   * Add operation to queue
   */
  async enqueue(
    type: GitOperation['type'],
    payload: any,
    priority: number = 5
  ): Promise<GitOperation> {
    const operation: GitOperation = {
      id: uuidv4(),
      type,
      payload,
      priority,
      status: 'pending',
      createdAt: new Date(),
    };
    
    // Insert based on priority (higher priority first)
    const insertIndex = this.queue.findIndex(op => op.priority < priority);
    if (insertIndex === -1) {
      this.queue.push(operation);
    } else {
      this.queue.splice(insertIndex, 0, operation);
    }
    
    this.eventEmitter.emit('git-queue.operation-added', operation);
    
    // Trigger processing
    this.processNext();
    
    return operation;
  }
  
  /**
   * Wait for operation to complete
   */
  async waitForOperation(id: string): Promise<GitOperation> {
    return new Promise((resolve, reject) => {
      const checkOperation = () => {
        const operation = this.getOperation(id);
        
        if (!operation) {
          reject(new Error('Operation not found'));
          return;
        }
        
        if (operation.status === 'completed') {
          resolve(operation);
        } else if (operation.status === 'failed') {
          reject(new Error(operation.error || 'Operation failed'));
        } else {
          // Check again in 100ms
          setTimeout(checkOperation, 100);
        }
      };
      
      checkOperation();
    });
  }
  
  /**
   * Get operation by ID
   */
  getOperation(id: string): GitOperation | undefined {
    return this.queue.find(op => op.id === id);
  }
  
  /**
   * Get queue status
   */
  getQueueStatus() {
    return {
      size: this.queue.length,
      processing: this.isProcessing,
      pending: this.queue.filter(op => op.status === 'pending').length,
      completed: this.queue.filter(op => op.status === 'completed').length,
      failed: this.queue.filter(op => op.status === 'failed').length,
    };
  }
  
  /**
   * Clear completed operations
   */
  clearCompleted() {
    this.queue = this.queue.filter(
      op => op.status !== 'completed' && op.status !== 'failed'
    );
  }
  
  /**
   * Start processing queue
   */
  private startProcessing() {
    setInterval(() => {
      this.processNext();
    }, 1000);
  }
  
  /**
   * Process next operation in queue
   */
  private async processNext() {
    if (this.isProcessing) return;
    
    const nextOperation = this.queue.find(op => op.status === 'pending');
    if (!nextOperation) return;
    
    this.isProcessing = true;
    nextOperation.status = 'processing';
    
    try {
      this.eventEmitter.emit('git-queue.operation-started', nextOperation);
      
      // Get handler for this operation type
      const handler = this.operationHandlers.get(nextOperation.type);
      if (!handler) {
        throw new Error(`No handler registered for operation type: ${nextOperation.type}`);
      }
      
      // Execute operation
      const result = await handler(nextOperation);
      
      // Mark as completed
      nextOperation.status = 'completed';
      nextOperation.completedAt = new Date();
      
      this.eventEmitter.emit('git-queue.operation-completed', {
        operation: nextOperation,
        result,
      });
      
    } catch (error) {
      nextOperation.status = 'failed';
      nextOperation.error = error instanceof Error ? error.message : 'Unknown error';
      nextOperation.completedAt = new Date();
      
      this.eventEmitter.emit('git-queue.operation-failed', {
        operation: nextOperation,
        error,
      });
    } finally {
      this.isProcessing = false;
      
      // Clean up old completed operations (keep last 100)
      if (this.queue.length > 100) {
        const completed = this.queue
          .filter(op => op.status === 'completed' || op.status === 'failed')
          .sort((a, b) => (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0));
        
        if (completed.length > 50) {
          const toRemove = completed.slice(50);
          this.queue = this.queue.filter(op => !toRemove.includes(op));
        }
      }
    }
  }
}