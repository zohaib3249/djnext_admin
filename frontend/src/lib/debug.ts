/** Debug helpers – no-ops by default; enable when needed for development. */
export function logToken(_message: string, _detail?: string | boolean): void {}
export function logBasePath(_label: string, _value: string, _source?: string): void {}
export function logLoading(_scope: string, _loading: boolean, _detail?: string): void {}
export function logApi(_method: string, _urlOrPath: string, _status?: number, _durationMs?: number): void {}
