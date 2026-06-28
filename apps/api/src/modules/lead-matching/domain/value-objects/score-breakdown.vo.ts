export class ScoreBreakdown {
  constructor(
    public readonly roleScore: number,
    public readonly skillsScore: number,
    public readonly salaryScore: number,
    public readonly experienceScore: number,
  ) {
    if (
      roleScore < 0 || roleScore > 100 ||
      skillsScore < 0 || skillsScore > 100 ||
      salaryScore < 0 || salaryScore > 100 ||
      experienceScore < 0 || experienceScore > 100
    ) {
      throw new Error('All breakdown scores must be between 0 and 100');
    }
  }

  get average(): number {
    return Math.round((this.roleScore + this.skillsScore + this.salaryScore + this.experienceScore) / 4);
  }

  static create(roleScore: number, skillsScore: number, salaryScore: number, experienceScore: number): ScoreBreakdown {
    return new ScoreBreakdown(roleScore, skillsScore, salaryScore, experienceScore);
  }

  equals(other: ScoreBreakdown): boolean {
    return (
      this.roleScore === other.roleScore &&
      this.skillsScore === other.skillsScore &&
      this.salaryScore === other.salaryScore &&
      this.experienceScore === other.experienceScore
    );
  }
}
