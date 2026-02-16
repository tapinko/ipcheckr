using IPCheckr.Api.Common.Enums;
using IPCheckr.Api.Models;

namespace IPCheckr.Api.Common.Utils
{
    public static class AssignmentEvaluationUtils
    {
        public static AssignmentGroupStatus ResolveStatus(DateTime startDate, DateTime deadline, DateTime? completedAt)
        {
            if (completedAt.HasValue)
                return AssignmentGroupStatus.ENDED;

            var now = DateTime.UtcNow;
            if (now < startDate)
                return AssignmentGroupStatus.UPCOMING;
            if (now <= deadline)
                return AssignmentGroupStatus.IN_PROGRESS;
            return AssignmentGroupStatus.ENDED;
        }

        public static double CalculateSubnetSuccessRate(SubnetAssignmentAnswerKey? answerKey, SubnetAssignmentSubmit? submit)
        {
            if (answerKey == null || submit == null)
                return 0.0;

            string[][] answerArrays =
            {
                answerKey.Networks ?? Array.Empty<string>(),
                answerKey.FirstUsables ?? Array.Empty<string>(),
                answerKey.LastUsables ?? Array.Empty<string>(),
                answerKey.Broadcasts ?? Array.Empty<string>()
            };
            string[][] submitArrays =
            {
                submit.Networks ?? Array.Empty<string>(),
                submit.FirstUsables ?? Array.Empty<string>(),
                submit.LastUsables ?? Array.Empty<string>(),
                submit.Broadcasts ?? Array.Empty<string>()
            };

            int totalFields = answerArrays.Sum(a => a.Length);
            if (totalFields == 0) return 0.0;

            int correctFields = 0;
            for (int i = 0; i < answerArrays.Length; i++)
            {
                var ansArr = answerArrays[i];
                var subArr = submitArrays[i];
                int len = Math.Min(ansArr.Length, subArr.Length);
                for (int j = 0; j < len; j++)
                {
                    if (ansArr[j] == subArr[j])
                        correctFields++;
                }
            }

            return (double)correctFields / totalFields * 100.0;
        }

        public static double CalculateIdNetSuccessRate(IDNetAssignmentAnswerKey? answerKey, IDNetAssignmentSubmit? submit, bool testWildcard, bool testFirstLastBr)
        {
            if (answerKey == null || submit == null)
                return 0.0;

            var answerList = new List<string[]> { answerKey.IDNet ?? Array.Empty<string>() };
            var submitList = new List<string[]> { submit.IDNet ?? Array.Empty<string>() };

            if (testWildcard)
            {
                answerList.Add(answerKey.Wildcards ?? Array.Empty<string>());
                submitList.Add(submit.Wildcard ?? Array.Empty<string>());
            }

            if (testFirstLastBr)
            {
                answerList.Add(answerKey.FirstUsables ?? Array.Empty<string>());
                submitList.Add(submit.FirstUsables ?? Array.Empty<string>());
                answerList.Add(answerKey.LastUsables ?? Array.Empty<string>());
                submitList.Add(submit.LastUsables ?? Array.Empty<string>());
                answerList.Add(answerKey.Broadcasts ?? Array.Empty<string>());
                submitList.Add(submit.Broadcasts ?? Array.Empty<string>());
            }

            int totalFields = answerList.Sum(a => a.Length);
            if (totalFields == 0) return 0.0;

            int correctFields = 0;
            for (int i = 0; i < answerList.Count; i++)
            {
                var ansArr = answerList[i];
                var subArr = submitList.ElementAtOrDefault(i) ?? Array.Empty<string>();
                int len = Math.Min(ansArr.Length, subArr.Length);
                for (int j = 0; j < len; j++)
                {
                    if (ansArr[j] == subArr[j])
                        correctFields++;
                }
            }

            return (double)correctFields / totalFields * 100.0;
        }
    }
}