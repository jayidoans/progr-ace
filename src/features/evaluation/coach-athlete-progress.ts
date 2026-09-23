import type { EvaluationProgram } from "@/src/features/evaluation/analytics";

export function groupCoachProgramsByGoal(programs: EvaluationProgram[]) {
  const grouped = new Map<string, EvaluationProgram[]>();
  programs.forEach((program) => {
    const group = grouped.get(program.race_goal.id) ?? [];
    group.push(program);
    grouped.set(program.race_goal.id, group);
  });
  grouped.forEach((group) => group.sort((left, right) =>
    right.start_date.localeCompare(left.start_date) || right.id.localeCompare(left.id),
  ));
  return grouped;
}
