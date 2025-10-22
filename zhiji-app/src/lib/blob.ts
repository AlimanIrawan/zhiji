import { put, list, del } from '@vercel/blob';

const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

export interface BlobListItem {
  pathname: string;
  url: string;
  size: number;
  uploadedAt?: string;
}

export async function putJson(pathname: string, data: any) {
  const body = JSON.stringify(data);
  const { url } = await put(pathname, body, {
    access: 'public',
    contentType: 'application/json',
    token: BLOB_TOKEN,
  });
  return { url };
}

export async function putBinary(pathname: string, body: ArrayBuffer | Blob | string, contentType?: string) {
  const { url } = await put(pathname, body as any, {
    access: 'public',
    contentType,
    token: BLOB_TOKEN,
    addRandomSuffix: false,
  });
  return { url };
}

export async function listByPrefix(prefix: string): Promise<BlobListItem[]> {
  const res = await list({ prefix, token: BLOB_TOKEN });
  return res.blobs.map((b: any) => ({ pathname: b.pathname, url: b.url, size: b.size }));
}

export async function getJsonByUrl(url: string): Promise<any | null> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    return await resp.json();
  } catch (e) {
    console.error('Blob getJsonByUrl error:', e);
    return null;
  }
}

export async function deleteByUrl(url: string): Promise<boolean> {
  try {
    await del(url, { token: BLOB_TOKEN } as any);
    return true;
  } catch (e) {
    console.error('Blob delete error:', e);
    return false;
  }
}