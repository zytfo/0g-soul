import { describe, it, expect } from 'vitest';
import { randomKey, exportRawKey, wrapKeyFromSignature, sealKey, unsealKey, encryptJSON, decryptJSON } from '../crypto';

describe('crypto', () => {
  it('seals and unseals K under a signature-derived wrap key', async () => {
    const wrap = await wrapKeyFromSignature('0x' + 'ab'.repeat(65));
    const K = await randomKey();
    const sealed = await sealKey(K, wrap);
    const K2 = await unsealKey(sealed, wrap);
    expect(Array.from(await exportRawKey(K2))).toEqual(Array.from(await exportRawKey(K)));
  });
  it('encrypts and decrypts a JSON memory blob', async () => {
    const K = await randomKey();
    const obj = { memorySummary: 's', keyFacts: ['a', 'b'], history: [{ role: 'user', content: 'hi' }] };
    const enc = await encryptJSON(obj, K);
    expect(await decryptJSON(enc, K)).toEqual(obj);
  });
  it('fails to unseal with the wrong wrap key', async () => {
    const K = await randomKey();
    const sealed = await sealKey(K, await wrapKeyFromSignature('0x' + '11'.repeat(65)));
    await expect(unsealKey(sealed, await wrapKeyFromSignature('0x' + '22'.repeat(65)))).rejects.toBeTruthy();
  });
});
