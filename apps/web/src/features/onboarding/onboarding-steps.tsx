export const ONBOARDING_STEPS = [
  'Thông tin lớp',
  'Các tổ',
  'Học sinh',
  'Công việc',
  'Kiểm tra',
  'Hoàn tất',
] as const;

export function OnboardingProgress({
  currentStep,
}: {
  readonly currentStep: number;
}): React.JSX.Element {
  const currentLabel = ONBOARDING_STEPS[currentStep - 1] ?? ONBOARDING_STEPS[0];
  return (
    <div>
      <ol className="step-progress" aria-label="Tiến độ thiết lập">
        {ONBOARDING_STEPS.map((label, index) => (
          <li
            key={label}
            className={index + 1 <= currentStep ? 'complete' : ''}
            {...(index + 1 === currentStep ? { 'aria-current': 'step' } : {})}
          >
            <span>{index + 1}</span>
            <small>{label}</small>
          </li>
        ))}
      </ol>
      <p className="step-progress-current">
        Bước {currentStep}/6 · {currentLabel}
      </p>
    </div>
  );
}
