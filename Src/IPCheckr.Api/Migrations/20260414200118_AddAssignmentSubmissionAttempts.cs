using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace IPCheckr.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddAssignmentSubmissionAttempts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "AttemptId",
                table: "SubnetAssignmentSubmits",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "AttemptId",
                table: "IDNetAssignmentSubmits",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "AssignmentSubmissionAttempts",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    AssignmentGroupType = table.Column<string>(type: "varchar(255)", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    AssignmentId = table.Column<int>(type: "int", nullable: false),
                    StudentId = table.Column<int>(type: "int", nullable: false),
                    AttemptNumber = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    LockToken = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    DraftJson = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    VisibilityIncidentCount = table.Column<int>(type: "int", nullable: false),
                    ReopenCount = table.Column<int>(type: "int", nullable: false),
                    StartedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    LastActivityAt = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    LastVisibleAt = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    LockedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    LastReopenedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    SubmittedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    LockReason = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AssignmentSubmissionAttempts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AssignmentSubmissionAttempts_Users_StudentId",
                        column: x => x.StudentId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_SubnetAssignmentSubmits_AttemptId",
                table: "SubnetAssignmentSubmits",
                column: "AttemptId");

            migrationBuilder.CreateIndex(
                name: "IX_IDNetAssignmentSubmits_AttemptId",
                table: "IDNetAssignmentSubmits",
                column: "AttemptId");

            migrationBuilder.CreateIndex(
                name: "IX_AssignmentSubmissionAttempts_AssignmentGroupType_AssignmentI~",
                table: "AssignmentSubmissionAttempts",
                columns: new[] { "AssignmentGroupType", "AssignmentId", "StudentId" });

            migrationBuilder.CreateIndex(
                name: "IX_AssignmentSubmissionAttempts_LockToken",
                table: "AssignmentSubmissionAttempts",
                column: "LockToken",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AssignmentSubmissionAttempts_StudentId",
                table: "AssignmentSubmissionAttempts",
                column: "StudentId");

            migrationBuilder.AddForeignKey(
                name: "FK_IDNetAssignmentSubmits_AssignmentSubmissionAttempts_AttemptId",
                table: "IDNetAssignmentSubmits",
                column: "AttemptId",
                principalTable: "AssignmentSubmissionAttempts",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_SubnetAssignmentSubmits_AssignmentSubmissionAttempts_Attempt~",
                table: "SubnetAssignmentSubmits",
                column: "AttemptId",
                principalTable: "AssignmentSubmissionAttempts",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_IDNetAssignmentSubmits_AssignmentSubmissionAttempts_AttemptId",
                table: "IDNetAssignmentSubmits");

            migrationBuilder.DropForeignKey(
                name: "FK_SubnetAssignmentSubmits_AssignmentSubmissionAttempts_Attempt~",
                table: "SubnetAssignmentSubmits");

            migrationBuilder.DropTable(
                name: "AssignmentSubmissionAttempts");

            migrationBuilder.DropIndex(
                name: "IX_SubnetAssignmentSubmits_AttemptId",
                table: "SubnetAssignmentSubmits");

            migrationBuilder.DropIndex(
                name: "IX_IDNetAssignmentSubmits_AttemptId",
                table: "IDNetAssignmentSubmits");

            migrationBuilder.DropColumn(
                name: "AttemptId",
                table: "SubnetAssignmentSubmits");

            migrationBuilder.DropColumn(
                name: "AttemptId",
                table: "IDNetAssignmentSubmits");
        }
    }
}
