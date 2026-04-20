using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace IPCheckr.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddAssignmentGroupDifficultyAndHostSortStrategy : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Difficulty",
                table: "SubnetAGs",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "HostSortStrategy",
                table: "SubnetAGs",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "Difficulty",
                table: "IDNetAGs",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Difficulty",
                table: "SubnetAGs");

            migrationBuilder.DropColumn(
                name: "HostSortStrategy",
                table: "SubnetAGs");

            migrationBuilder.DropColumn(
                name: "Difficulty",
                table: "IDNetAGs");
        }
    }
}
