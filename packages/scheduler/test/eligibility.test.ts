import { describe, expect, it } from 'vitest';
import { parseDateOnly } from '@lop-sach/contracts';
import { isStudentEligible } from '../src/index.js';
import { createOccurrence, createStudent } from './fixtures.js';

const date = parseDateOnly('2026-08-25');

describe('scheduler hard eligibility', () => {
  it('applies group, active, participation and duty-week absence rules', () => {
    const occurrence = createOccurrence({ id: 'sweep', date });
    expect(isStudentEligible(createStudent({ id: 'ok' }), occurrence, 'group-1', [])).toBe(true);
    expect(
      isStudentEligible(
        createStudent({ id: 'other', groupId: 'group-2' }),
        occurrence,
        'group-1',
        [],
      ),
    ).toBe(false);
    expect(
      isStudentEligible(
        createStudent({ id: 'inactive', active: false }),
        occurrence,
        'group-1',
        [],
      ),
    ).toBe(false);
    expect(
      isStudentEligible(
        createStudent({ id: 'late', participationStart: parseDateOnly('2026-08-26') }),
        occurrence,
        'group-1',
        [],
      ),
    ).toBe(false);
    expect(
      isStudentEligible(
        createStudent({ id: 'left', participationEnd: parseDateOnly('2026-08-24') }),
        occurrence,
        'group-1',
        [],
      ),
    ).toBe(false);
    expect(
      isStudentEligible(createStudent({ id: 'absent' }), occurrence, 'group-1', [
        { studentId: 'absent', date },
      ]),
    ).toBe(false);
  });

  it('uses only the three approved persistent restriction types', () => {
    const heavy = createOccurrence({
      id: 'heavy',
      date,
      workloadLevel: 3,
      taskTemplateId: 'task-heavy',
    });
    expect(
      isStudentEligible(
        createStudent({ id: 'no-heavy', restrictions: [{ id: 'r1', type: 'NO_HEAVY_TASKS' }] }),
        heavy,
        'group-1',
        [],
      ),
    ).toBe(false);
    expect(
      isStudentEligible(
        createStudent({
          id: 'excluded',
          restrictions: [{ id: 'r2', type: 'TASK_EXCLUSION', taskTemplateId: 'task-heavy' }],
        }),
        heavy,
        'group-1',
        [],
      ),
    ).toBe(false);
    expect(
      isStudentEligible(
        createStudent({
          id: 'exempt',
          restrictions: [
            {
              id: 'r3',
              type: 'EXEMPT_DATE_RANGE',
              startDate: parseDateOnly('2026-08-24'),
              endDate: parseDateOnly('2026-08-26'),
            },
          ],
        }),
        heavy,
        'group-1',
        [],
      ),
    ).toBe(false);
  });

  it('applies hard gender rules without inferring gender from task names', () => {
    const maleOnly = createOccurrence({
      id: 'male',
      date,
      taskName: 'Công việc chung',
      eligibilityRule: 'MALE_ONLY',
    });
    expect(
      isStudentEligible(createStudent({ id: 'male', gender: 'MALE' }), maleOnly, 'group-1', []),
    ).toBe(true);
    expect(
      isStudentEligible(createStudent({ id: 'female', gender: 'FEMALE' }), maleOnly, 'group-1', []),
    ).toBe(false);
    const any = createOccurrence({ id: 'any', date, taskName: 'Đổ rác', eligibilityRule: 'ANY' });
    expect(isStudentEligible(createStudent({ id: 'unspecified' }), any, 'group-1', [])).toBe(true);
  });

  it('has a date-only occurrence model and does not turn same-day work into a hard constraint', () => {
    const first = createOccurrence({ id: 'first', date });
    const second = createOccurrence({ id: 'second', date });
    const student = createStudent({ id: 'student' });
    expect(Object.keys(first)).not.toEqual(
      expect.arrayContaining(['startTime', 'endTime', 'timeBucket']),
    );
    expect(isStudentEligible(student, first, 'group-1', [])).toBe(true);
    expect(isStudentEligible(student, second, 'group-1', [])).toBe(true);
  });
});
