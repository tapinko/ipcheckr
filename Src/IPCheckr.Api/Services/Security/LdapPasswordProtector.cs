using Microsoft.AspNetCore.DataProtection;

namespace IPCheckr.Api.Services.Security
{
    public interface ILdapPasswordProtector
    {
        string Protect(string plaintext);
        string? TryUnprotect(string ciphertext);
    }

    public class LdapPasswordProtector : ILdapPasswordProtector
    {
        private readonly IDataProtector _protector;

        public LdapPasswordProtector(IDataProtectionProvider provider)
        {
            _protector = provider.CreateProtector("IPCheckr.LdapBindPassword");
        }

        public string Protect(string plaintext) => _protector.Protect(plaintext);

        public string? TryUnprotect(string ciphertext)
        {
            if (string.IsNullOrEmpty(ciphertext))
                return null;
            try
            {
                return _protector.Unprotect(ciphertext);
            }
            catch
            {
                return null;
            }
        }
    }
}