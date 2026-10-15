export type SurveySubmitState = {
  error: string | null;
  submitted: boolean;
};

export const initialSurveySubmitState: SurveySubmitState = {
  error: null,
  submitted: false,
};
