import { useQuery } from '@tanstack/react-query';
import { fetchEvents } from './api';
import { workQueryKeys } from '../type';

export function useEventsQuery() {
  return useQuery({
    queryKey: workQueryKeys.events(),
    queryFn: fetchEvents,
  });
}
