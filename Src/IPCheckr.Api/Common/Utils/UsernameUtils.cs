using System;

namespace IPCheckr.Api.Common.Utils
{
    public static class UsernameUtils
    {
        /// <summary>
        /// Returns a display-friendly username without the LDAP domain suffix.
        /// If the username contains an '@', everything after (and including) the first '@' is removed.
        /// </summary>
        public static string ToDisplay(string? username)
        {
            if (string.IsNullOrWhiteSpace(username)) return username ?? string.Empty;
            int at = username.IndexOf('@');
            if (at <= 0) return username;
            return username.Substring(0, at);
        }
    }
}
