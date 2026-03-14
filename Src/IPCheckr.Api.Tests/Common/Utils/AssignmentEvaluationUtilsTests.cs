using IPCheckr.Api.Common.Enums;
using IPCheckr.Api.Common.Utils;
using IPCheckr.Api.Models;

namespace IPCheckr.Api.Tests.Common.Utils;

public class AssignmentEvaluationUtilsTests
{
    [Fact]
    public void ResolveStatus_ReturnsUpcoming_WhenStartInFuture()
    {
        var start = DateTime.Now.AddMinutes(5);
        var deadline = DateTime.Now.AddHours(1);

        var status = AssignmentEvaluationUtils.ResolveStatus(start, deadline, null);

        Assert.Equal(AssignmentGroupStatus.UPCOMING, status);
    }

    [Fact]
    public void ResolveStatus_ReturnsInProgress_WhenWithinTimeWindow()
    {
        var start = DateTime.Now.AddMinutes(-5);
        var deadline = DateTime.Now.AddMinutes(20);

        var status = AssignmentEvaluationUtils.ResolveStatus(start, deadline, null);

        Assert.Equal(AssignmentGroupStatus.IN_PROGRESS, status);
    }

    [Fact]
    public void ResolveStatus_ReturnsEnded_WhenCompletedAtExists()
    {
        var status = AssignmentEvaluationUtils.ResolveStatus(
            DateTime.Now.AddHours(-1),
            DateTime.Now.AddHours(1),
            DateTime.Now.AddMinutes(-1));

        Assert.Equal(AssignmentGroupStatus.ENDED, status);
    }

    [Fact]
    public void CalculateSubnetSuccessRate_ReturnsExpectedPercentage()
    {
        var answerKey = new SubnetAssignmentAnswerKey
        {
            Assignment = null!,
            Networks = ["10.0.0.0", "10.0.1.0"],
            FirstUsables = ["10.0.0.1", "10.0.1.1"],
            LastUsables = ["10.0.0.254", "10.0.1.254"],
            Broadcasts = ["10.0.0.255", "10.0.1.255"]
        };

        var submit = new SubnetAssignmentSubmit
        {
            Assignment = null!,
            Networks = ["10.0.0.0", "10.0.1.5"],
            FirstUsables = ["10.0.0.1", "10.0.1.9"],
            LastUsables = ["10.0.0.254", "10.0.1.254"],
            Broadcasts = ["10.0.0.255", "10.0.1.9"]
        };

        var rate = AssignmentEvaluationUtils.CalculateSubnetSuccessRate(answerKey, submit);

        Assert.Equal(62.5, rate, 1);
    }

    [Fact]
    public void CalculateIdNetSuccessRate_RespectsFeatureFlags()
    {
        var answerKey = new IDNetAssignmentAnswerKey
        {
            Assignment = null!,
            IDNet = ["192.168.1.0"],
            Wildcards = ["0.0.0.255"],
            FirstUsables = ["192.168.1.1"],
            LastUsables = ["192.168.1.254"],
            Broadcasts = ["192.168.1.255"]
        };

        var submit = new IDNetAssignmentSubmit
        {
            Assignment = null!,
            IDNet = ["192.168.1.0"],
            Wildcard = ["0.0.0.0"],
            FirstUsables = ["192.168.1.1"],
            LastUsables = ["192.168.1.200"],
            Broadcasts = ["192.168.1.255"]
        };

        var onlyIdNet = AssignmentEvaluationUtils.CalculateIdNetSuccessRate(answerKey, submit, false, false);
        var idNetAndWildcard = AssignmentEvaluationUtils.CalculateIdNetSuccessRate(answerKey, submit, true, false);
        var allParts = AssignmentEvaluationUtils.CalculateIdNetSuccessRate(answerKey, submit, true, true);

        Assert.Equal(100.0, onlyIdNet, 5);
        Assert.Equal(50.0, idNetAndWildcard, 5);
        Assert.Equal(60.0, allParts, 5);
    }

    [Fact]
    public void CalculateSubnetSuccessRate_ReturnsZero_WhenInputMissing()
    {
        var rate = AssignmentEvaluationUtils.CalculateSubnetSuccessRate(null, null);

        Assert.Equal(0.0, rate, 5);
    }
}