import { useQuery } from '@tanstack/react-query';
import { fetchLeaveRequests } from './api';
import { workQueryKeys } from '../type';

export function useLeaveRequestsQuery() {
  return useQuery({
    queryKey: workQueryKeys.leaveRequests(),
    queryFn: fetchLeaveRequests,
  });
}
