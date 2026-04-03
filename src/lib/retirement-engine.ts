import {
  Account,
  UserProfile,
  LumpSumWithdrawal,
  ProjectionDataPoint,
  StressTestResult,
} from '@/types';
import {
  generateProjection,
  calculateTotalBalance,
  calculateTotalContributions,
  calculateAverageReturnRate,
  calculateStatePensionEquivalent,
  calculateProgress,
  calculateRequiredContribution,
  calculateTotalRetirementIncome,
  calculateRequiredBalanceNow,
  calculateTargetReachAge,
  calculateCoastFireNumber,
  findCoastFireYear,
  calculateIsaBridgeProgress,
  calculateMarketDropImpact,
  getYearsToRetirement,
  IsaBridgeProgress,
} from '@/lib/calculations';

export interface RetirementProjection {
  /** Raw year-by-year simulation — computed once, shared by all consumers */
  points: ProjectionDataPoint[];

  // Portfolio summary
  totalBalance: number;
  totalContributions: number;
  averageReturnRate: number;
  yearsToRetirement: number;

  // Projected values derived from points (no re-simulation)
  projectedTotal: number;
  projectedTotalReal: number;

  // Goal tracking
  statePensionEquivalent: number;
  effectiveTarget: number;
  progress: number;
  requiredContribution: number;
  retirementIncome: { portfolioIncome: number; statePensionIncome: number; totalIncome: number };

  // Confidence
  confidenceScore: number;

  // Milestones
  requiredBalanceNow: number;
  targetReachAge: number | null;

  // Coast FIRE
  coastFireInfo: { age: number; amount: number } | null;

  // ISA Bridge
  isaBridgeProgress: IsaBridgeProgress;

  // Stress tests precomputed for 20%, 30%, 40% market drops
  stressTests: StressTestResult[];
}

/**
 * Pure function — computes the full retirement picture from a single
 * generateProjection call. All derived values come from that one run.
 */
export function computeRetirement(
  accounts: Account[],
  profile: UserProfile,
  withdrawals: LumpSumWithdrawal[] = []
): RetirementProjection {
  // THE expensive call — runs exactly once per unique input set
  const points = generateProjection(accounts, profile, withdrawals);

  // Derive projected totals from points instead of running a separate simulation
  const lastPoint = points.length > 0 ? points[points.length - 1] : null;
  const totalBalance = calculateTotalBalance(accounts);
  const projectedTotal = lastPoint?.total ?? totalBalance;
  const projectedTotalReal = lastPoint?.totalReal ?? totalBalance;

  const totalContributions = calculateTotalContributions(accounts);
  const averageReturnRate = calculateAverageReturnRate(accounts);
  const yearsToRetirement = getYearsToRetirement(profile);

  // State pension + goal tracking
  const statePensionEquivalent = calculateStatePensionEquivalent(profile);
  const effectiveTarget = profile.targetAmount - statePensionEquivalent;
  const progress = calculateProgress(projectedTotalReal, effectiveTarget);
  const requiredContribution = calculateRequiredContribution(
    totalBalance,
    effectiveTarget,
    yearsToRetirement,
    averageReturnRate,
    profile.expectedInflation
  );
  const retirementIncome = calculateTotalRetirementIncome(projectedTotalReal, profile);

  // Confidence score — inlined to reuse already-computed points
  const conservativeAtRetirement = lastPoint?.underperformanceReal ?? 0;
  const progressRatio = projectedTotalReal / profile.targetAmount;
  let score = Math.min(5, progressRatio * 5);
  if (progressRatio > 1) score += Math.min(2, (progressRatio - 1) * 4);
  score += Math.min(2, yearsToRetirement / 20);
  if (conservativeAtRetirement >= profile.targetAmount) score += 1;
  const confidenceScore = Math.min(10, Math.max(1, Math.round(score)));

  // Milestone support
  const requiredBalanceNow = calculateRequiredBalanceNow(accounts, profile, profile.targetAmount);
  const targetReachAge = calculateTargetReachAge(accounts, profile);

  // Coast FIRE — derived from already-computed points
  const realReturn = Math.max(0, averageReturnRate - profile.expectedInflation);
  const coastFireNumber = calculateCoastFireNumber(profile, realReturn);
  const coastFireYearIndex = findCoastFireYear(points, coastFireNumber);
  const coastFireInfo =
    coastFireYearIndex !== null && points[coastFireYearIndex]
      ? { age: points[coastFireYearIndex].age, amount: coastFireNumber }
      : null;

  // ISA Bridge
  const isaBridgeProgress = calculateIsaBridgeProgress(accounts, profile);

  // Stress tests — fixed scenarios, precomputed here so components get them for free
  const stressTests = [20, 30, 40].map((drop) => calculateMarketDropImpact(accounts, profile, drop));

  return {
    points,
    totalBalance,
    totalContributions,
    averageReturnRate,
    yearsToRetirement,
    projectedTotal,
    projectedTotalReal,
    statePensionEquivalent,
    effectiveTarget,
    progress,
    requiredContribution,
    retirementIncome,
    confidenceScore,
    requiredBalanceNow,
    targetReachAge,
    coastFireInfo,
    isaBridgeProgress,
    stressTests,
  };
}
