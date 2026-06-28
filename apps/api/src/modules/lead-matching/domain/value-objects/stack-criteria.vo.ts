export class StackCriteria {
  constructor(public readonly skills: string[]) {
    if (!skills) {
      throw new Error('Skills criteria cannot be null');
    }
  }

  static create(skills: string[]): StackCriteria {
    return new StackCriteria(skills.map(s => s.trim().toLowerCase()));
  }

  match(candidateSkills: string[]): { matched: string[]; missing: string[] } {
    const candidateLower = candidateSkills.map(s => s.trim().toLowerCase());
    const matched: string[] = [];
    const missing: string[] = [];

    for (const skill of this.skills) {
      if (candidateLower.includes(skill)) {
        matched.push(skill);
      } else {
        missing.push(skill);
      }
    }

    return { matched, missing };
  }

  calculateScore(candidateSkills: string[]): number {
    if (this.skills.length === 0) return 100;
    const { matched } = this.match(candidateSkills);
    return Math.round((matched.length / this.skills.length) * 100);
  }
}
