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
  return (
    <ol className="step-progress" aria-label="Tiến độ thiết lập">
      {ONBOARDING_STEPS.map((label, index) => (
        <li key={label} className={index + 1 <= currentStep ? 'complete' : ''}>
          <span>{index + 1}</span>
          <small>{label}</small>
        </li>
      ))}
    </ol>
  );
}
