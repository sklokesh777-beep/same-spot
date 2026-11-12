// Restore everything from a backup file. Used by Settings > Data and by the
// welcome screen, for someone moving to a new phone.

import { ask, confirmAsk, toast } from '../components/overlay';
import { BackupError, openBackup, readBackupHeader, restoreBackup, summarise } from '../data/backup';
import { pickFile } from '../data/photos';

/** Must be called straight from a tap, so the file picker can open. True when restored. */
export async function restoreFromBackup(): Promise<boolean> {
  const file = await pickFile({ camera: false, accept: 'application/json,.json' });
  if (!file) return false;
  try {
    const head = readBackupHeader(await file.text());
    let password: string | undefined;
    if (head.locked) {
      const r = await ask({ title: 'This backup has a password', input: { label: 'Password', type: 'password' }, confirmLabel: 'Open backup' });
      if (!r.ok) return false;
      password = r.value;
    }
    const payload = await openBackup(head, password);
    const sum = summarise(payload);
    const ok = await confirmAsk({
      title: 'Replace what is on this device?',
      body: `The backup has ${sum.trackers} tracker${sum.trackers === 1 ? '' : 's'} and ${sum.photos} photo${sum.photos === 1 ? '' : 's'}. It replaces everything on this device now.`,
      confirmLabel: 'Import and replace',
      danger: true,
    });
    if (!ok) return false;
    await restoreBackup(payload);
    toast('Backup imported.');
    return true;
  } catch (e) {
    toast(e instanceof BackupError ? e.message : "That backup couldn't be imported.");
    return false;
  }
}
