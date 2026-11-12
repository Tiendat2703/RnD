const KEY = 'meetmate-teacher-member:';
export function teacherToken(id: string): string { return localStorage.getItem(KEY + id) ?? ''; }
export function rememberTeacherAccess(id: string, token: string): void { localStorage.setItem(KEY + id, token); }
