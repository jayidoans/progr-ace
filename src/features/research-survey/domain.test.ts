import assert from "node:assert/strict";
import test from "node:test";
import { calculateResearchSurveyScores, RESEARCH_SURVEY_CODES } from "./domain";

test("calculates standard SUS and independent dimension means", () => {
  const answers = Object.fromEntries(RESEARCH_SURVEY_CODES.map((code) => [code, 3]));
  assert.deepEqual(calculateResearchSurveyScores(answers), { susScore: 50, tmMean: 3, evMean: 3, acMean: 3 });
});

test("does not reverse-score TM, EV, or AC dimensions", () => {
  const answers = Object.fromEntries(RESEARCH_SURVEY_CODES.map((code) => [code, 1]));
  answers.TM01 = 5; answers.TM02 = 4; answers.TM03 = 3;
  const result = calculateResearchSurveyScores(answers);
  assert.equal(result.tmMean, 4);
  assert.equal(result.susScore, 50);
});
