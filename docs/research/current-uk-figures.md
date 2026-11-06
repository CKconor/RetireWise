# Current UK figures behind RetireWise (2026/27)

Checked 2026-11-06, against code at commit `5c09c6c`. Facts only, not financial advice. No app code was changed.

Bracketed numbers such as [1] refer to the [Sources](#sources) list. "Calculated" means my arithmetic, not a published figure. Section 7 lists what I couldn't verify.

## Summary of code problems

| # | Location | Current value | Correct value |
|---|---|---|---|
| 1 | `src/lib/drawdown.ts:132` | Flat 10% CGT on taxable gains | 18% on gains within the unused basic rate band, 24% above it [5][6] |
| 2 | `src/lib/drawdown.ts:48`, used at `:55` | Higher rate band of £74,870 (`HIGHER_LIMIT - BASIC_LIMIT`) | £87,440 of taxable income (£37,701 to £125,140) once the allowance is fully tapered [4] |
| 3 | `src/lib/storage.ts:107` | £221.20 a week, labelled 2024/25 | £241.30 a week for 2026/27 [1][2] |
| 4 | `src/lib/storage.ts:108` | Default State Pension age 67, paired with a default birth year of `currentYear - 30` (1996) | 68 for that birth date [8][9] |
| 5 | `src/types/index.ts:28` | Comment says "default 67" | Depends on date of birth: 66 to 68 for people not yet at State Pension age [8][9][10] |
| 6 | `src/lib/calculations.ts:891` | Comment says pension access age is 58 | 57 from 6 April 2028, and the code constant is already 57 [11] |
| 7 | `src/lib/drawdown.ts:118` | 25% tax-free per account, with no cap | 25%, capped at the £268,275 lump sum allowance (higher with protection) [4][7] |

The same stale values also appear outside `src/lib` and `src/types`:

- `src/contexts/retirement-store-context.tsx:79`: £221.20
- `src/contexts/retirement-store-context.tsx:80`: age 67, with the same default birth year
- `src/components/profile-form.tsx:154`: hint text "Full rate: £221.20 a week"

`src/lib/__tests__/drawdown.test.ts:106` asserts the 10% CGT rate, so it pins error 1.

### Detail on error 2: additional rate band

`calculateIncomeTax` (`src/lib/drawdown.ts:42-56`) subtracts the allowance from income, then applies a higher band of £74,870. That band only fits when the full £12,570 allowance applies. The real limit is £125,140 of taxable income [4], so the function charges up to £12,570 at 45% instead of 40%.

I copied the function's logic into a scratch script and compared it with the statutory bands. The figures below are calculated:

| Total income | App | Statutory | Overstatement |
|---|---|---|---|
| £100,000 | £27,432.00 | £27,432.00 | £0 |
| £116,760 | £37,488.00 | £37,488.00 | £0 (the error starts above this income) |
| £120,000 | £39,675.00 | £39,432.00 | £243.00 |
| £125,140 | £43,144.50 | £42,516.00 | £628.50 |
| £150,000 | £54,331.50 | £53,703.00 | £628.50 |

### Detail on error 7: the 25% calculation

- `src/lib/drawdown.ts:118` takes 25% of each account's balance at retirement, separately.
- Because nothing caps the total, tax-free cash across accounts can exceed £268,275.
- The balance is a snapshot at retirement, so growth after retirement adds nothing to the tax-free amount. gov.uk describes the entitlement as up to 25% of "the amount built up" [7]. I didn't check how the rules treat later growth in detail.

## Values that match

| Location | Value | Status |
|---|---|---|
| `src/lib/drawdown.ts:34` | Personal allowance £12,570 | Correct for 2026/27 and 2027/28 [3][4] |
| `src/lib/drawdown.ts:35` | Higher rate threshold £50,270 | Correct [3][4][13] |
| `src/lib/drawdown.ts:36` | Additional rate threshold £125,140 | Correct, but see error 2 for how it's used [3][4] |
| `src/lib/drawdown.ts:37` | CGT annual exempt amount £3,000 | Correct [4][5][18] |
| `src/lib/drawdown.ts:43-44` | Allowance taper, £1 per £2 above £100,000 | Correct [3] |
| `src/lib/drawdown.ts:51-55` | Rates of 20%, 40% and 45% | Correct [3][4] |
| `src/lib/calculations.ts:761` | Weekly State Pension × 52 | Consistent: £250.70 × 52 = £13,036.40 (calculated; see section 1) |
| `src/lib/constants.ts:4`, `src/lib/drawdown.ts:242` | Pension access age 57 | Correct from 6 April 2028. It's 55 until then, and protected pension ages and uniformed services schemes differ [11][12] |

## Rules the model leaves out

These aren't wrong values, but they affect how closely the model follows the rules:

- **Pension Tax Allowance:** not modelled (section 6).
- **Scottish income tax:** only the England, Wales and Northern Ireland bands are used.
- **Tax on interest and dividends:** `src/lib/drawdown.ts:101-102` treats savings withdrawals as tax-free. That's right for withdrawn capital, but the code has no tax on interest or on GIA dividends.
- **CGT bands:** the correct rate depends on taxable income, so a fix needs `taxableIncome` in the CGT calculation, not just a new constant [5].
- **Real-terms assumption:** drawdown works in real terms (`src/lib/drawdown.ts:214`), and both the thresholds and the State Pension stay flat in those terms. In law, the allowance and basic rate limit are frozen in cash terms until 5 April 2031 [13], and the State Pension rises under the triple lock [1][16].
- **Personal allowance headroom:** `src/lib/drawdown.ts:290` caps tax-efficient pension withdrawals at the allowance left after the State Pension. At the correct rates that's £22.40 in 2026/27 and nil in 2027/28 (calculated). The stale £221.20 default gives £1,067.60.
- **RMD table:** `src/lib/drawdown.ts:17-19` uses what its own comment calls the IRS Uniform Lifetime Table. That's a US source, and none of the UK sources I read use it. I didn't check its figures against the IRS.

## 1. State Pension

**2026/27 rate**

- The full new State Pension is **£241.30 a week** [1][2], which is £12,547.60 a year (calculated).
- Earlier rates were £230.25 in 2025/26 [2] and £221.20 in 2024/25 [14]. The code's label is accurate, but the value is two tax years old.

**Uprating**

- Under the triple lock, the pension rises each year by the highest of earnings growth, CPI inflation or 2.5% [1].
- The triple lock is government policy on top of a narrower statutory duty. Section 150A of the Social Security Administration Act 1992 requires increases that at least match earnings, and the text I read mentions neither CPI nor 2.5% [15].
- The April 2026 rise was 4.8%, following earnings [17].

**Announced changes**

- **April 2027:** a 3.9% rise, taking the full rate to **£13,036.40 a year** [19]. That works out at £250.70 a week (calculated, not quoted by any source I could read).
- **Through to April 2029:** the triple lock continues as it is [16].
- **From April 2030:** the pension rises by the highest of 2.5%, inflation or the amount needed to keep its value relative to earnings as reached in April 2029 [19]. The Budget says this removes the "ratchet" effect, and that the pension will then track earnings over time [16].

## 2. State Pension age

| Date of birth | State Pension age | Source |
|---|---|---|
| 6 April 1960 to 5 March 1961 | 66 + 1 to 11 months, stepped by birth month | [8][10] |
| 6 March 1961 to 5 April 1977 | 67 | [8] |
| 6 April 1977 to 5 April 1978 | Fixed dates from 6 May 2044 to 6 March 2046 | [8][9] |
| 6 April 1978 onwards | 68 | [8][9] |

People born before 6 April 1960 have already reached State Pension age, or do so under earlier rules not covered here.

The third State Pension age review was launched in July 2025 and hasn't announced any change on its gov.uk collection page [20]. Any change would need Parliament's approval [8].

## 3. Normal minimum pension age

- The age is **55 now** and **57 on and after 6 April 2028** [11][12].
- Uniformed services schemes (armed forces, police, firefighters) stay at 55 [11][21].
- Members may get a protected pension age if they had a right to take benefits below 57 immediately before 4 November 2021, and their scheme rules on 11 February 2021 provided it [11]. A search snippet of one gov.uk page says 3 November, but the legislation settles it as "immediately before 4 November 2021".

## 4. Income tax (England, Wales and Northern Ireland)

| Band | Taxable income | Rate |
|---|---|---|
| Personal allowance | Up to £12,570 | 0% |
| Basic | £12,571 to £50,270 | 20% |
| Higher | £50,271 to £125,140 | 40% |
| Additional | Over £125,140 | 45% |

- **Taper:** the allowance falls by £1 for every £2 of adjusted net income above £100,000, and reaches zero at £125,140 [3].
- **Bands after the allowance:** the basic rate band is £1 to £37,700, and the higher rate band runs from £37,701 to £125,140 [4].
- **Freeze:** the allowance and basic rate limit stay frozen until 5 April 2031, then rise with CPI by default [13].
- **2027/28:** Budget 2026's rates annex shows the same bands and main rates as 2026/27 [4].

**Scotland:** 2026/27 rates are 19% to £16,537, 20% to £29,526, 21% to £43,662, 42% to £75,000, 45% to £125,140 and 48% above that, with the same £12,570 allowance [22].

## 5. Capital gains tax

- **Annual exempt amount:** £3,000 for individuals in 2026/27 and 2027/28 [4][18].
- **Rates:** 18% or 24% for individuals [6]. Add taxable gains to taxable income: the part within the £37,700 basic rate band is taxed at 18%, and the rest at 24% [5]. Higher and additional rate taxpayers pay 24% [5].
- **Founders' Relief:** the 10% rate announced for April 2027 is a relief for qualifying share disposals, up to £10 million of lifetime gains [16]. It isn't a general rate and doesn't support the code's 10%.

## 6. Pension tax-free cash and announced changes

**Tax-free cash**

- People can usually take up to 25% of a pension tax-free, and the most they can take is £268,275 [7].
- The **lump sum allowance** is **£268,275**, and the **lump sum and death benefit allowance** is **£1,073,100**, in both 2026/27 and 2027/28 [4].
- A protected allowance may increase the limit [7].
- £268,275 is 25% of £1,073,100 (calculated).

**Announced changes that could affect the model**

| Effective | Change | Effect on the model |
|---|---|---|
| 2026 to 2028 | State Pension age rises from 66 to 67 [8] | `statePensionAge` isn't derived from birthday |
| April 2027 | New State Pension rises 3.9% to £13,036.40 a year, above the personal allowance for the first time [19] | Default amount, and a full State Pension alone now exceeds the allowance |
| 6 April 2027 to 5 April 2030 | **Pension Tax Allowance**: for people at or over State Pension age, worth up to £94 in 2027/28. Income up to the full new State Pension gets the full amount, and it falls by £1 per £3 above that, reaching nil at £13,319 [23] | `calculateIncomeTax` has no such reduction |
| 6 April 2027 | Savings income rates rise to 24%, 44% and 49% [4][24] | Not modelled |
| 6 April 2027 | Most unused pension funds and death benefits fall within Inheritance Tax [25] | Estates aren't modelled |
| 6 April 2028 | Normal minimum pension age rises to 57 [11] | The constant is already 57, so the model doesn't allow access at 55 or 56 before that date |
| April 2029 | Only the first £2,000 a year of salary-sacrificed employee pension contributions is exempt from National Insurance [26] | Not modelled |
| April 2030 | Adjusted triple lock [16][19] | Long-term State Pension growth, which the model doesn't apply |
| 5 April 2031 | End of the allowance and basic rate limit freeze [13] | Thresholds are constant in the model |

Also in force or decided, with no matching logic in `src/lib`:

- Dividend rates are 10.75%, 35.75% and 39.35% in 2026/27 [4].
- The cash ISA limit stays at £20,000 [16][24].

## 7. What I couldn't verify

- **2027/28 weekly rate:** no source I could read states £250.70. It's calculated from the published £13,036.40.
- **Written statement of 28 October 2026 (HCWS427):** the page returned HTTP 403. The 12 April 2027 start date and the May to July 2026 earnings basis were only visible in search snippets, so I've left them out of the findings above. The 3.9% figure comes from the Government Actuary's bulletin [19].
- **Third State Pension age review:** I couldn't confirm whether the independent report or the Government Actuary's report has been published, or their findings. A Lords debate of 22 July 2026 also returned HTTP 403. Search snippets suggested the report had been handed in and that the review is due by the end of March 2029, but I couldn't read the source.
- **Adjusted triple lock:** I couldn't confirm whether it needs, or already has, legislation.
- **Transitional rules for pension age:** I didn't confirm the final status of the rules for people aged 55 or 56 on 5 April 2028. Draft regulations exist.
- **Additional rate threshold after 2027/28:** the freeze page covers the allowance and basic rate limit, not this threshold [13]. Budget 2026 also says the 2027/28 main rates are to be set by Finance Bill 2026-27 [24], so that year's figures aren't yet enacted as far as I could confirm.
- **Lump sum allowance legislation:** the figures come from gov.uk and the Budget annex. I didn't read the underlying Finance Act 2024 provisions, including exactly how the allowance applies across several schemes.
- **Up-rating Order 2026:** the £241.30 rate comes from gov.uk and DWP pages, whose web address still says "proposed". I didn't read the order itself.

Most pages were read through a fetch tool that summarises and quotes them, not as raw text. In the Budget 2026 document, the tool's view ended around Table 6.1 item 72, so anything after that wasn't covered. It found no statement on State Pension age, normal minimum pension age or the 25% rule before that point.

## Sources

All were accessed on 2026-11-06.

1. [The new State Pension: what you'll get, gov.uk](https://www.gov.uk/new-state-pension/what-youll-get)
2. [Benefit and pension rates 2026 to 2027, DWP](https://www.gov.uk/government/publications/benefit-and-pension-rates-2026-to-2027/proposed-benefit-and-pension-rates-2026-to-2027)
3. [Income Tax rates and Personal Allowances, gov.uk](https://www.gov.uk/income-tax-rates)
4. [Budget 2026 OOTLAR, Annex A: rates and allowances, HM Treasury and HMRC](https://www.gov.uk/government/publications/budget-2026-overview-of-tax-legislation-and-rates-ootlar/annex-a-rates-and-allowances)
5. [Capital Gains Tax rates, gov.uk](https://www.gov.uk/capital-gains-tax/rates)
6. [Taxation of Chargeable Gains Act 1992, section 1H](https://www.legislation.gov.uk/ukpga/1992/12/section/1H)
7. [Tax on your private pension: tax-free amounts, gov.uk](https://www.gov.uk/tax-on-pension/tax-free)
8. [State Pension age timetable, DWP](https://www.gov.uk/government/publications/state-pension-age-timetable/state-pension-age-timetable) (page last updated May 2014)
9. [Pensions Act 2007, Schedule 3](https://www.legislation.gov.uk/ukpga/2007/22/schedule/3)
10. [Pensions Act 2014, section 26](https://www.legislation.gov.uk/ukpga/2014/19/section/26)
11. [Finance Act 2022, section 10](https://www.legislation.gov.uk/ukpga/2022/3/section/10)
12. [Pensions Tax Manual PTM028000, HMRC](https://www.gov.uk/hmrc-internal-manuals/pensions-tax-manual/ptm028000)
13. [Maintaining the Personal Allowance and basic rate limit until 5 April 2031, HMRC](https://www.gov.uk/government/publications/maintaining-income-tax-and-equivalent-national-insurance-contributions-thresholds-until-5-april-2031/income-tax-maintaining-the-personal-allowance-and-the-basic-rate-limit-for-income-tax-and-equivalent-national-insurance-contributions-thresholds-unt)
14. [Benefit and pension rates 2024 to 2025, DWP](https://www.gov.uk/government/publications/benefit-and-pension-rates-2024-to-2025/benefit-and-pension-rates-2024-to-2025)
15. [Social Security Administration Act 1992, section 150A](https://www.legislation.gov.uk/ukpga/1992/5/section/150A)
16. [Budget 2026, sections 2.2, 3.9, 5.6 and 6.3, and Box 5.A, HM Treasury](https://www.gov.uk/government/publications/budget-2026-document/budget-2026-html)
17. [Over 12 million pensioners to receive £575 State Pension boost, DWP](https://www.gov.uk/government/news/over-12-million-pensioners-to-receive-575-state-pension-boost)
18. [Capital Gains Tax allowances, gov.uk](https://www.gov.uk/capital-gains-tax/allowances)
19. [Budget 2026: a GAD technical bulletin, Government Actuary's Department](https://www.gov.uk/government/publications/budget-2026-a-gad-technical-bulletin/budget-2026-a-gad-technical-bulletin)
20. [Third State Pension age review, DWP](https://www.gov.uk/government/collections/third-state-pension-age-review)
21. [Increasing Normal Minimum Pension Age, HMRC](https://www.gov.uk/government/publications/increasing-normal-minimum-pension-age/increasing-normal-minimum-pension-age)
22. [Income Tax in Scotland, gov.uk](https://www.gov.uk/scottish-income-tax)
23. [Pension Tax Allowance explainer, HM Treasury](https://www.gov.uk/government/publications/pension-tax-allowance-explainer/pension-tax-allowance-explainer)
24. [Budget 2026 OOTLAR, HM Treasury and HMRC](https://www.gov.uk/government/publications/budget-2026-overview-of-tax-legislation-and-rates-ootlar/budget-2026-overview-of-tax-legislation-and-rates-ootlar)
25. [Reforming Inheritance Tax: unused pension funds and death benefits, HMRC](https://www.gov.uk/government/publications/reforming-inheritance-tax-unused-pension-funds-and-death-benefits)
26. [Changes to salary sacrifice for pensions from April 2029, HMRC](https://www.gov.uk/government/publications/changes-to-salary-sacrifice-for-pensions-from-april-2029/changes-to-salary-sacrifice-for-pensions-from-april-2029)
