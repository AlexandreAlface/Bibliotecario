// src/app/route-loaders.ts
import { redirect } from 'react-router-dom';
import { getMe } from '@/services/auth';

export async function requireAuthLoader() {
  try {
    const me = await getMe();
    return me; // isto vai para useLoaderData() da página
  } catch (err: any) {
    if (err?.response?.status === 401) throw redirect('/login');
    throw err;
  }
}
