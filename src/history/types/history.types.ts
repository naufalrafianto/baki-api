export interface RepMetadata {
  isCorrect: boolean;
  timestamp: string;
}

export interface SummaryMetadata {
  exerciseName: string;
  totalSets: number;
  totalReps: number;
  totalDuration: number;
  completedAt: string;
}
