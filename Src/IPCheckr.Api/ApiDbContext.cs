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
        public DbSet<SubnetAG> SubnetAGs { get; set; }
        public DbSet<IDNetAG> IDNetAGs { get; set; }

        public DbSet<SubnetAssignment> SubnetAssignments { get; set; }
        public DbSet<IDNetAssignment> IDNetAssignments { get; set; }

        public DbSet<SubnetAssignmentAnswerKey> SubnetAssignmentAnswerKeys { get; set; }
        public DbSet<IDNetAssignmentAnswerKey> IDNetAssignmentAnswerKeys { get; set; }

        public DbSet<SubnetAssignmentSubmit> SubnetAssignmentSubmits { get; set; }
        public DbSet<IDNetAssignmentSubmit> IDNetAssignmentSubmits { get; set; }
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

            modelBuilder.Entity<SubnetAG>()
                .Property(ag => ag.Status)
                .HasConversion<string>()
                .IsRequired();

            modelBuilder.Entity<IDNetAG>()
                .Property(ag => ag.Status)
                .HasConversion<string>()
                .IsRequired();

            modelBuilder.Entity<SubnetAssignment>()
                .HasOne(a => a.AssignmentGroup)
                .WithMany()
                .HasForeignKey("AssignmentGroupId")
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<SubnetAssignment>()
                .HasOne(a => a.Student)
                .WithMany()
                .HasForeignKey("StudentId")
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<IDNetAssignment>()
                .HasOne(a => a.AssignmentGroup)
                .WithMany()
                .HasForeignKey("AssignmentGroupId")
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<IDNetAssignment>()
                .HasOne(a => a.Student)
                .WithMany()
                .HasForeignKey("StudentId")
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<SubnetAssignmentAnswerKey>()
                .HasOne(aak => aak.Assignment)
                .WithMany()
                .HasForeignKey("AssignmentId")
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<IDNetAssignmentAnswerKey>()
                .HasOne(aak => aak.Assignment)
                .WithMany()
                .HasForeignKey("AssignmentId")
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<SubnetAssignmentSubmit>()
                .HasOne(sub => sub.Assignment)
                .WithMany()
                .HasForeignKey("AssignmentId")
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<IDNetAssignmentSubmit>()
                .HasOne(sub => sub.Assignment)
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