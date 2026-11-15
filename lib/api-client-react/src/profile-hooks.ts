import { useMutation, useQueryClient } from '@tanstack/react-query';
import { customFetch } from './custom-fetch';
import type { BuyerProfileInput, MakerBrandInput } from './generated/api.schemas';
import { getGetWorkspaceQueryKey } from './generated/api';

type Receipt = { id: string; message: string };

export const saveMakerFullProfile = (body: MakerBrandInput) =>
  customFetch<Receipt>('/api/maker/brand', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

export const saveBuyerProfile = (body: BuyerProfileInput) =>
  customFetch<Receipt>('/api/buyer/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

export function useSaveMakerFullProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { data: MakerBrandInput }) => saveMakerFullProfile(vars.data),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: getGetWorkspaceQueryKey() }); },
  });
}

export function useSaveBuyerProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { data: BuyerProfileInput }) => saveBuyerProfile(vars.data),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: getGetWorkspaceQueryKey() }); },
  });
}
