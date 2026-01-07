using System;
using System.ComponentModel.DataAnnotations;

namespace IPCheckr.Api.DTOs.Gns3
{
    public class ForceStopAllRes
    {
        [Required]
        public int StoppedCount { get; set; }

        [Required]
        public int FailedCount { get; set; }

        public string[] FailedUsers { get; set; } = Array.Empty<string>();

        public string[] FailedReasons { get; set; } = Array.Empty<string>();
    }
}