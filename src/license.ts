const { machineIdSync } = require('node-machine-id');
import Store from 'electron-store';
import crypto from 'crypto';

const store = new Store();

interface License {
  key: string;
  email: string;
  machineId: string;
  activatedAt: number;
  expiresAt?: number;
  type: 'monthly' | 'multi-year';
}

export class LicenseManager {
  private static readonly API_URL = 'https://api.getintentional.dev/v1/license';
  
  static getMachineId(): string {
    return machineIdSync();
  }
  
  static async validateLicense(licenseKey: string, email: string): Promise<boolean> {
    try {
      const machineId = this.getMachineId();
      
      // Check if already activated on this machine
      const storedLicense = store.get('license') as License | undefined;
      if (storedLicense?.key === licenseKey && storedLicense.machineId === machineId) {
        return !this.isExpired(storedLicense);
      }
      
      // Validate with server
      const response = await fetch(`${this.API_URL}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: licenseKey,
          email,
          machineId,
          platform: process.platform
        })
      });
      
      if (!response.ok) {
        const error: any = await response.json();
        throw new Error(error.message || 'Invalid license');
      }
      
      const data: any = await response.json();
      const license: License = {
        key: licenseKey,
        email,
        machineId,
        activatedAt: Date.now(),
        expiresAt: data.expiresAt,
        type: data.type || 'monthly'
      };
      
      store.set('license', license);
      return true;
    } catch (error) {
      console.error('License validation error:', error);
      return false;
    }
  }
  
  static isLicensed(): boolean {
    const license = store.get('license') as License | undefined;
    if (!license) return false;
    
    // Verify machine ID matches
    if (license.machineId !== this.getMachineId()) return false;
    
    return !this.isExpired(license);
  }
  
  private static isExpired(license: License): boolean {
    if (!license.expiresAt) return false;
    return Date.now() > license.expiresAt;
  }
  
  static async deactivate(): Promise<void> {
    const license = store.get('license') as License | undefined;
    if (!license) return;
    
    try {
      await fetch(`${this.API_URL}/deactivate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: license.key,
          machineId: license.machineId
        })
      });
    } catch (error) {
      console.error('Deactivation error:', error);
    }
    
    store.delete('license');
  }
}