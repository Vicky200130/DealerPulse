// Shared TypeScript types. These mirror the Pydantic models the
// FastAPI backend returns, so the frontend stays type-safe.

export interface Health {
  status: string;
  branches: number;
  sales_reps: number;
  leads: number;
  deliveries: number;
  date_range: string;
}
