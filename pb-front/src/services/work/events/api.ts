import { apiClient } from '@/api/apiClient';
import type {
  CreateEventInput,
  DeleteEventInput,
  EventDTO,
  UpdateEventInput,
} from '../type';

export async function fetchEvents(): Promise<EventDTO[]> {
  const { data } = await apiClient.get<EventDTO[]>('/events');
  return data;
}

export async function createEvent(input: CreateEventInput): Promise<EventDTO> {
  const { data } = await apiClient.post<EventDTO>('/events', input);
  return data;
}

export async function updateEvent(input: UpdateEventInput): Promise<EventDTO> {
  const { data } = await apiClient.patch<EventDTO>(`/events/${input.id}`, input.patch);
  return data;
}

export async function deleteEvent(input: DeleteEventInput): Promise<void> {
  await apiClient.delete(`/events/${input.id}`);
}
