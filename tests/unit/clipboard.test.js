import { describe, expect, it, vi } from 'vitest';
import { copyText } from '../../src/lib/clipboard.js';

describe('copyText', () => {
  it('writes to the async clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    await copyText('secret');
    expect(writeText).toHaveBeenCalledWith('secret');
    vi.unstubAllGlobals();
  });

  it('propagates failures', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
    await expect(copyText('secret')).rejects.toThrow('denied');
    vi.unstubAllGlobals();
  });
});
