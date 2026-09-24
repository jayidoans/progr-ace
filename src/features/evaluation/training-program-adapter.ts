import type { TrainingProgramDetail } from "@/src/features/training/queries";

import type { EvaluationProgram } from "./analytics";

// The Training Program page already loads this source-of-truth hierarchy for
// the schedule. Keep M10's input shape separate from the page payload while
// reusing that request-scoped result instead of querying the Program twice.
export function evaluationProgramFromTrainingProgram(program: TrainingProgramDetail): EvaluationProgram {
  return {
    id: program.id,
    name: program.name,
    status: program.status,
    start_date: program.start_date,
    end_date: program.end_date,
    tracking_start_date: program.tracking_start_date,
    cancelled_at: program.cancelled_at,
    created_by: program.created_by,
    race_goal: {
      id: program.race_goal.id,
      athlete_id: program.race_goal.athlete_id,
      status: program.race_goal.status,
      target_finish_time_sec: program.race_goal.target_finish_time_sec,
      completed_at: program.race_goal.completed_at,
      completed_by: program.race_goal.completed_by,
      athlete: program.race_goal.athlete,
      race: program.race_goal.race,
    },
    weeks: program.weeks.map((week) => ({
      id: week.id,
      week_number: week.week_number,
      phase: week.phase,
      planning_status: week.planning_status,
      start_date: week.start_date,
      end_date: week.end_date,
      prescriptions: week.prescriptions.map((prescription) => ({
        id: prescription.id,
        scheduled_date: prescription.scheduled_date,
        title: prescription.title,
        training_menu: prescription.training_menu,
        components: prescription.components.map((component) => ({
          id: component.id,
          target_distance_m: component.target_distance_m,
          sequence_order: component.sequence_order,
        })),
        claims: prescription.claim ? [{
          id: prescription.claim.id,
          status: prescription.claim.status,
          submitted_at: prescription.claim.submitted_at,
          validation: prescription.claim.validation ? {
            result: prescription.claim.validation.result,
            evaluation_source: prescription.claim.validation.evaluation_source,
          } : null,
          evidence: prescription.claim.evidence,
        }] : [],
      })),
    })),
  };
}
