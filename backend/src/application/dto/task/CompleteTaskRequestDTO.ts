export interface CompleteTaskRequestDTO {
  qualityScore?: {
    timeliness: number;
    completeness: number;
    satisfaction: number;
  };
}
