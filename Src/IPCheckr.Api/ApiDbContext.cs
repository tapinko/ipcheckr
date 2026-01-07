using Microsoft.EntityFrameworkCore;
using IPCheckr.Api.Models;

namespace IPCheckr.Api
{
    public class ApiDbContext : DbContext
    {
        public ApiDbContext(DbContextOptions<ApiDbContext> options)
            : base(options)
        {}

        public DbSet<User> Users { get; set; }
        public DbSet<Class> Classes { get; set; }
        public DbSet<AssignmentGroup> AssignmentGroups { get; set; }
        public DbSet<Assignment> Assignments { get; set; }
        public DbSet<AssignmentAnswerKey> AssignmentAnswerKeys { get; set; }
        public DbSet<AssignmentSubmit> AssignmentSubmits { get; set; }
        public DbSet<AppSettings> AppSettings { get; set; }
        public DbSet<Gns3Session> Gns3Sessions { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Class>()
                .HasMany(c => c.Teachers)
                .WithMany()
                .UsingEntity<Dictionary<string, object>>(
                    "ClassTeacher",
                    j => j.HasOne<User>()
                          .WithMany()
                          .HasForeignKey("TeacherId")
                          .OnDelete(DeleteBehavior.Cascade),
                    j => j.HasOne<Class>()
                          .WithMany()
                          .HasForeignKey("ClassId")
                          .OnDelete(DeleteBehavior.Cascade),
                    j =>
                    {
                        j.ToTable("ClassTeachers");
                        j.HasKey("ClassId", "TeacherId");
                    });

            modelBuilder.Entity<Class>()
                .HasMany(c => c.Students)
                .WithMany()
                .UsingEntity<Dictionary<string, object>>(
                    "ClassStudent",
                    j => j.HasOne<User>()
                          .WithMany()
                          .HasForeignKey("StudentId")
                          .OnDelete(DeleteBehavior.Cascade),
                    j => j.HasOne<Class>()
                          .WithMany()
                          .HasForeignKey("ClassId")
                          .OnDelete(DeleteBehavior.Cascade),
                    j =>
                    {
                        j.ToTable("ClassStudents");
                        j.HasKey("ClassId", "StudentId");
                    });

            modelBuilder.Entity<Assignment>()
                .HasOne(a => a.AssignmentGroup)
                .WithMany()
                .HasForeignKey("AssignmentGroupId")
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<AssignmentAnswerKey>()
                .HasOne(aak => aak.Assignment)
                .WithMany()
                .HasForeignKey("AssignmentId")
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<AssignmentSubmit>()
                .HasOne(asub => asub.Assignment)
                .WithMany()
                .HasForeignKey("AssignmentId")
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<AppSettings>(entity =>
            {
                entity.ToTable("AppSettings");
                entity.HasKey(a => a.Id);

                entity.Property(a => a.Name)
                      .IsRequired()
                      .HasMaxLength(200);

                entity.HasIndex(a => a.Name)
                      .IsUnique();

                entity.Property(a => a.Value)
                      .HasColumnType("text")
                      .IsRequired(false);
            });

            modelBuilder.Entity<Gns3Session>(entity =>
            {
                entity.ToTable("Gns3Sessions");
                entity.HasKey(s => s.Id);
                entity.Property(s => s.Status)
                      .HasConversion<string>()
                      .IsRequired();

                entity.HasOne(s => s.User)
                      .WithMany()
                      .HasForeignKey(s => s.UserId)
                      .OnDelete(DeleteBehavior.Cascade);
            });
        }
    }
}