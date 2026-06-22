import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createEvent, deleteEvent, updateEvent } from './api';
import { workQueryKeys, type EventDTO } from '../type';

export function useCreateEventMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createEvent,
    onSuccess: (created) => {
      qc.setQueryData<EventDTO[]>(workQueryKeys.events(), (prev) =>
        prev ? [...prev, created] : [created]
      );
    },
  });
}

export function useUpdateEventMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateEvent,
    onSuccess: (updated) => {
      qc.setQueryData<EventDTO[]>(workQueryKeys.events(), (prev) =>
        prev?.map((e) => (e.id === updated.id ? updated : e))
      );
    },
  });
}

export function useDeleteEventMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteEvent,
    onSuccess: (_data, { id }) => {
      qc.setQueryData<EventDTO[]>(workQueryKeys.events(), (prev) =>
        prev ? prev.filter((e) => e.id !== id) : prev
      );
    },
  });
}
