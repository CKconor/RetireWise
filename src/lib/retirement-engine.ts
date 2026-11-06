import {
  Account,
  UserProfile,
  LumpSumWithdrawal,
  ProjectionDataPoint,
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
  calculateRealReturn,
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

  // Milestones
  requiredBalanceNow: number;
  targetReachAge: number | null;

  // Coast FIRE
  coastFireInfo: { age: number; amount: number } | null;

  // ISA Bridge
  isaBridgeProgress: IsaBridgeProgress;

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

  // Milestone support
  const requiredBalanceNow = calculateRequiredBalanceNow(accounts, profile, profile.targetAmount);
  const targetReachAge = calculateTargetReachAge(accounts, profile, withdrawals);

  // Coast FIRE — derived from already-computed points
  const realReturn = calculateRealReturn(averageReturnRate, profile.expectedInflation);
  const coastFireNumber = calculateCoastFireNumber(profile, realReturn);
  const coastFireYearIndex = findCoastFireYear(points, coastFireNumber);
  const coastFireInfo =
    coastFireYearIndex !== null && points[coastFireYearIndex]
      ? { age: points[coastFireYearIndex].age, amount: coastFireNumber }
      : null;

  // ISA Bridge
  const isaBridgeProgress = calculateIsaBridgeProgress(accounts, profile, withdrawals);

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
    requiredBalanceNow,
    targetReachAge,
    coastFireInfo,
    isaBridgeProgress,
  };
}
