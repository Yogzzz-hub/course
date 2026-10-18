export interface Challenge {
  id:string; version:number; title:string; category:string; difficulty:string; statement:string; starter:string;
  samples:{input:unknown;output:unknown}[]; hidden:{input:unknown;output:unknown}[];
  reference:string; faulty:string[];
  understanding:{prompt:string;options:string[];answer:number;explanation:string};
}
export const challenges:Challenge[]=[
  {id:'sum-values',version:1,title:'Sum a sequence',category:'Arrays, loops and functions',difficulty:'beginner',
    statement:'Read one JSON array of integers from standard input. Print its sum as JSON. The empty array sums to 0. There are at most 10,000 integers, each between -1,000,000 and 1,000,000. Print only the result, without prompts.',
    starter:'import json\nimport sys\n\nvalues = json.load(sys.stdin)\n# Compute the total, then print it as JSON.\n',
    samples:[{input:[1,2,3],output:6},{input:[],output:0}],hidden:[{input:[-5,2,-3],output:-6},{input:[4,4,4],output:12},{input:Array(10000).fill(1000000),output:10000000000}],
    reference:'import json, sys\nprint(json.dumps(sum(json.load(sys.stdin))))',
    faulty:['import json,sys\nprint(len(json.load(sys.stdin)))','import json,sys\nprint(sum(set(json.load(sys.stdin))))'],
    understanding:{prompt:'A solution uses sum(set(values)). For which input does it fail to preserve the required total?',options:['[2, 2]','[1, 2]','[]','[-1, 1]'],answer:0,explanation:'A set removes duplicates. [2, 2] must sum to 4, not 2.'}},
  {id:'word-counts',version:1,title:'Count normalized words',category:'Strings and dictionaries',difficulty:'intermediate',
    statement:'Read a JSON array of strings. Each string contains only ASCII letters. Count words case-insensitively and print a JSON object mapping lowercase words to counts. Preserve duplicates in counts. Empty input produces {}. At most 5,000 words of up to 40 characters. Object key order does not matter.',
    starter:'import json\nimport sys\n\nwords = json.load(sys.stdin)\n# Normalize words and count every occurrence.\n',
    samples:[{input:['Cat','cat','DOG'],output:{cat:2,dog:1}},{input:[],output:{}}],hidden:[{input:['A','a','A'],output:{a:3}},{input:['red','blue','RED','Blue'],output:{red:2,blue:2}},{input:Array(5000).fill('WORD'),output:{word:5000}}],
    reference:'import json,sys\nfrom collections import Counter\nprint(json.dumps(dict(Counter(w.lower() for w in json.load(sys.stdin)))))',
    faulty:['import json,sys\nfrom collections import Counter\nprint(json.dumps(dict(Counter(json.load(sys.stdin)))))','import json,sys\nprint(json.dumps({w.lower():1 for w in json.load(sys.stdin)}))'],
    understanding:{prompt:'Why must normalization happen before dictionary lookup and increment?',options:['Different letter cases must update the same key','It sorts the keys automatically','It removes repeated words','It changes strings to numbers'],answer:0,explanation:'Normalizing first ensures Cat and cat both increment the cat key.'}},
  {id:'merge-intervals',version:1,title:'Merge service availability',category:'Algorithms and backend data processing',difficulty:'advanced',
    statement:'Read a JSON array of closed integer intervals [start,end], where start <= end. Merge overlapping or touching intervals and print intervals sorted by start. Negative endpoints and duplicate intervals are valid. Empty input returns []. Up to 10,000 intervals with endpoints between -1,000,000 and 1,000,000.',
    starter:'import json\nimport sys\n\nintervals = json.load(sys.stdin)\n# Merge overlapping or touching intervals.\n',
    samples:[{input:[[1,3],[3,5],[8,9]],output:[[1,5],[8,9]]},{input:[],output:[]}],
    hidden:[{input:[[5,6],[-3,2],[1,8]],output:[[-3,8]]},{input:[[1,9],[2,3],[1,9]],output:[[1,9]]},{input:[[2,2]],output:[[2,2]]},{input:Array.from({length:10000},(_,i)=>[i,i+1]),output:[[0,10000]]}],
    reference:'import json,sys\nout=[]\nfor start,end in sorted(json.load(sys.stdin)):\n    if out and start <= out[-1][1]:\n        out[-1][1]=max(out[-1][1],end)\n    else:\n        out.append([start,end])\nprint(json.dumps(out))',
    faulty:['import json,sys\nprint(json.dumps(sorted(json.load(sys.stdin))))','import json,sys\nout=[]\nfor s,e in sorted(json.load(sys.stdin)):\n if out and s < out[-1][1]: out[-1][1]=e\n else: out.append([s,e])\nprint(json.dumps(out))'],
    understanding:{prompt:'When [1, 9] is followed by [2, 3], why must the merged end use max(previous_end, end)?',options:['Otherwise the merged interval incorrectly shrinks','It makes the result unsorted','It removes all negative endpoints','It prevents JSON parsing errors'],answer:0,explanation:'The second interval is contained in the first. Replacing 9 with 3 would discard covered availability.'}},
];
export function publicChallenge(c:Challenge) {return {id:c.id,version:c.version,title:c.title,category:c.category,difficulty:c.difficulty,statement:c.statement,starter:c.starter,samples:c.samples};}
