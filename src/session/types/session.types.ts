export interface SetProgress {
  setNumber: number;
  reps: number;
  startTime: string;
  endTime?: string;
  duration?: number;
  completedAt: string;
}

export interface SessionProgress {
  userId: string;
  exerciseId: number;
  dailyPlanId: number;
  startTime: string;
  completedSets: SetProgress[];
}
