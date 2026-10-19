export interface Rubric {sampleCorrectness:number;edgeCases:number;understanding:number}
const defaultRubric:Readonly<Rubric>=Object.freeze({sampleCorrectness:60,edgeCases:20,understanding:20});
// Absent weights preserve the meaning of existing, snapshotted challenge versions.
export function challengeRubric(challenge:{rubric?:Rubric}):Readonly<Rubric>{
  const rubric=challenge.rubric??defaultRubric;
  const weights=[rubric.sampleCorrectness,rubric.edgeCases,rubric.understanding];
  if(weights.some(weight=>!Number.isInteger(weight)||weight<0||weight>100)||weights.reduce((a,b)=>a+b,0)!==100)
    throw new Error('Challenge rubric must contain integer weights totaling 100.');
  return rubric;
}
