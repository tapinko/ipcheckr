using IPCheckr.Api.Common.Utils;

namespace IPCheckr.Api.Tests.Common.Utils;

public class UsernameUtilsTests
{
    [Theory]
    [InlineData("student@school.local", "student")]
    [InlineData("teacher", "teacher")]
    [InlineData("@domain.local", "@domain.local")]
    [InlineData("", "")]
    public void ToDisplay_ReturnsExpectedValue(string input, string expected)
    {
        var value = UsernameUtils.ToDisplay(input);

        Assert.Equal(expected, value);
    }

    [Fact]
    public void ToDisplay_ReturnsEmpty_WhenNull()
    {
        var value = UsernameUtils.ToDisplay(null);

        Assert.Equal(string.Empty, value);
    }

    [Theory]
    [InlineData("valid.user")]
    [InlineData("valid-user")]
    [InlineData("valid_user@school.local")]
    [InlineData("abc")]
    public void IsUsernameValid_ReturnsTrue_ForAllowedPattern(string username)
    {
        var valid = Gns3SessionHelpers.IsUsernameValid(username);

        Assert.True(valid);
    }

    [Fact]
    public void IsUsernameValid_ReturnsTrue_ForVeryLongUsername()
    {
        var username = new string('a', 256);

        var valid = Gns3SessionHelpers.IsUsernameValid(username);

        Assert.True(valid);
    }

    [Theory]
    [InlineData("ab")]
    [InlineData("contains space")]
    [InlineData("/etc/passwd")]
    [InlineData("bad@domain@domain")]
    [InlineData("")]
    public void IsUsernameValid_ReturnsFalse_ForDisallowedPattern(string username)
    {
        var valid = Gns3SessionHelpers.IsUsernameValid(username);

        Assert.False(valid);
    }
}