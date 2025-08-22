import { api } from './api';

export const childModeApi = {
  actAs: (childId: number) =>
    api('/auth/act-as-child', { method: 'POST', json: { childId } }),
  clear: () =>
    api('/auth/act-as-clear', { method: 'POST' }),
};
