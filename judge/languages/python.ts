import type { CaseReport, FatalReport, LanguageAdapter } from '../types';

/**
 * The Python harness. The candidate source is embedded as a string and executed in its own
 * namespace; test inputs arrive on stdin; each result is printed on its own line behind a
 * per-run token. Expected values never enter the sandbox — the grader compares on the server,
 * so printing fake result lines cannot produce a pass.
 */
export const pythonAdapter: LanguageAdapter = {
  language: 'python',
  buildProgram(source, functionName, token) {
    return [
      'import json as _j, sys as _s, copy as _c',
      `_TOKEN = ${JSON.stringify(token)}`,
      `_SOURCE = ${JSON.stringify(source)}`,
      `_FN = ${JSON.stringify(functionName)}`,
      'def _emit(obj):',
      '    _s.stdout.write(_TOKEN + _j.dumps(obj) + "\\n")',
      '    _s.stdout.flush()',
      'def _plain(value, depth=0):',
      '    if depth > 1000: return {"__repr__": "too deep"}',
      '    if value is None or isinstance(value, (bool, int, str)): return value',
      '    if isinstance(value, float):',
      '        return value if value == value and value not in (float("inf"), float("-inf")) else {"__float__": repr(value)}',
      '    if isinstance(value, (list, tuple)): return [_plain(v, depth + 1) for v in value]',
      '    if isinstance(value, dict): return {str(k): _plain(v, depth + 1) for k, v in value.items()}',
      '    if isinstance(value, (set, frozenset)): return sorted((_plain(v, depth + 1) for v in value), key=repr)',
      '    return {"__repr__": repr(value)[:200]}',
      '_cases = _j.loads(_s.stdin.buffer.read().decode("utf-8") or "[]")',
      '_ns = {"__name__": "solution"}',
      'try:',
      '    exec(compile(_SOURCE, "solution.py", "exec"), _ns)',
      'except SyntaxError as _e:',
      '    _emit({"fatal": "compile", "error": type(_e).__name__, "message": ("line %s: %s" % (_e.lineno, _e.msg))[:500]})',
      '    raise SystemExit(0)',
      'except BaseException as _e:',
      '    _emit({"fatal": "load", "error": type(_e).__name__, "message": str(_e)[:500]})',
      '    raise SystemExit(0)',
      '_fn = _ns.get(_FN)',
      'if not callable(_fn):',
      '    _emit({"fatal": "missing", "error": "NameError", "message": "Define a function named " + _FN + "."})',
      '    raise SystemExit(0)',
      '_s.setrecursionlimit(5000)',
      'for _case in _cases:',
      '    try:',
      '        _emit({"id": _case["id"], "ok": True, "value": _plain(_fn(*_c.deepcopy(_case["args"])))})',
      '    except Exception as _e:',
      '        _emit({"id": _case["id"], "ok": False, "error": type(_e).__name__, "message": str(_e)[:200]})',
      '',
    ].join('\n');
  },
  parseOutput(stdout, token) {
    const cases: CaseReport[] = [];
    let fatal: FatalReport | undefined;
    for (const line of stdout.split(/\r?\n/)) {
      if (!line.startsWith(token)) continue;
      try {
        const value = JSON.parse(line.slice(token.length)) as CaseReport | FatalReport;
        if ('fatal' in value) fatal ??= value;
        else if (typeof value.id === 'string' && !cases.some(item => item.id === value.id)) cases.push(value);
      } catch { /* A malformed line is ignored; its case counts as not run. */ }
    }
    return { cases, fatal };
  },
};
