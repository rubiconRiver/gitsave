import { IPCHandler, IPCContext } from '../IPCRouter';
import { LicenseManager } from '../../../license';
import { shell } from 'electron';
import * as path from 'path';

export const licenseHandlers: { [key: string]: IPCHandler } = {
  'license:activate': async function(this: IPCContext, _, email: string, key: string) {
    const success = await LicenseManager.validateLicense(key, email);
    if (success) {
      // Need to reload main window - passed through context
      const mb = (this as any).mb;
      mb.window?.loadFile(path.join(__dirname, '..', '..', '..', '..', 'src', 'index.html'));
      return { success: true };
    }
    return { success: false, error: 'Invalid license key or activation failed' };
  },

  'license:openPurchase': async function(this: IPCContext) {
    shell.openExternal('https://getintentional.dev/buy');
  }
};