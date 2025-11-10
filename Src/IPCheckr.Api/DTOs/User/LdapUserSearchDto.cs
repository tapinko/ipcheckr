using System.ComponentModel.DataAnnotations;

namespace IPCheckr.Api.DTOs.User
{
    public class LdapUserSearchReq
    {
        public string? Q { get; set; }

        public string? OuDn { get; set; }

        public string? GroupDn { get; set; }

        [Range(1, 100, ErrorMessage = "Limit must be between 1 and 100.")]
        public int? Limit { get; set; } = 20;
    }

	public class LdapUserDto
	{
		[Required]
		public required string Username { get; set; }

		[Required]
		public required string DistinguishedName { get; set; }
	}

	public class LdapUserSearchRes
	{
		[Required]
		public required LdapUserDto[] Users { get; set; }

		[Required]
		public int TotalCount { get; set; }
	}
}
