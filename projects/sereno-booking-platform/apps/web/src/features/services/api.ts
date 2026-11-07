import { useQuery } from "@tanstack/vue-query";
import {
  api,
  type Business,
  type Service,
  type Staff,
} from "../../lib/api/client";
export const useServices = () =>
  useQuery({
    queryKey: ["services"],
    queryFn: () => api<Service[]>("/services"),
    staleTime: 60000,
  });
export const useStaff = () =>
  useQuery({
    queryKey: ["staff"],
    queryFn: () => api<Staff[]>("/staff"),
    staleTime: 60000,
  });
export const useBusiness = () =>
  useQuery({
    queryKey: ["business"],
    queryFn: () => api<Business>("/business"),
    staleTime: 60000,
  });
