using System.ComponentModel.DataAnnotations;

namespace IPCheckr.Api.DTOs.AGTemplate
{
    public class DeleteAGTemplatesReq
    {
        [Required(ErrorMessage = "Template IDs are required.")]
        [MinLength(1, ErrorMessage = "At least one template ID is required.")]
        public required int[] TemplateIds { get; set; }
    }
}