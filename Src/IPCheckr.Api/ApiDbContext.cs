using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
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
        public DbSet<AssignmentSubmissionAttempt> AssignmentSubmissionAttempts { get; set; }
        public DbSet<AppSettings> AppSettings { get; set; }
        public DbSet<Gns3Session> Gns3Sessions { get; set; }
        public DbSet<AGTemplate> AGTemplates { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Ensure all DateTime values read from the DB are tagged as UTC so the JSON
            // serializer emits the "Z" suffix and browsers can convert to local time correctly.
            var utcConverter = new ValueConverter<DateTime, DateTime>(
                v => v.Kind == DateTimeKind.Utc ? v : v.ToUniversalTime(),
                v => DateTime.SpecifyKind(v, DateTimeKind.Utc));

            var utcNullableConverter = new ValueConverter<DateTime?, DateTime?>(
                v => v.HasValue
                    ? (v.Value.Kind == DateTimeKind.Utc ? v : v.Value.ToUniversalTime())
                    : v,
                v => v.HasValue
                    ? DateTime.SpecifyKind(v.Value, DateTimeKind.Utc)
                    : v);

            foreach (var entityType in modelBuilder.Model.GetEntityTypes())
            {
                foreach (var property in entityType.GetProperties())
                {
                    if (property.ClrType == typeof(DateTime))
                        property.SetValueConverter(utcConverter);
                    else if (property.ClrType == typeof(DateTime?))
                        property.SetValueConverter(utcNullableConverter);
                }
            }


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

            modelBuilder.Entity<SubnetAG>()
                .Property(ag => ag.Difficulty)
                .HasConversion<string>();

            modelBuilder.Entity<SubnetAG>()
                .Property(ag => ag.HostSortStrategy)
                .HasConversion<string>();

            modelBuilder.Entity<IDNetAG>()
                .Property(ag => ag.Status)
                .HasConversion<string>()
                .IsRequired();

            modelBuilder.Entity<IDNetAG>()
                .Property(ag => ag.Difficulty)
                .HasConversion<string>();

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

            modelBuilder.Entity<AssignmentSubmissionAttempt>(entity =>
            {
                entity.ToTable("AssignmentSubmissionAttempts");
                entity.HasKey(a => a.Id);

                entity.Property(a => a.Status)
                    .HasConversion<string>()
                    .IsRequired();

                entity.Property(a => a.AssignmentGroupType)
                    .HasConversion<string>()
                    .IsRequired();

                entity.Property(a => a.LockToken)
                    .IsRequired()
                    .HasMaxLength(64);

                entity.Property(a => a.DraftJson)
                    .HasColumnType("longtext");

                entity.HasOne(a => a.Student)
                    .WithMany()
                    .HasForeignKey(a => a.StudentId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasIndex(a => new { a.AssignmentGroupType, a.AssignmentId, a.StudentId });
                entity.HasIndex(a => a.LockToken)
                    .IsUnique();
            });

            modelBuilder.Entity<SubnetAssignmentSubmit>(entity =>
            {
                entity.HasOne(sub => sub.Attempt)
                    .WithMany()
                    .HasForeignKey("AttemptId")
                    .OnDelete(DeleteBehavior.SetNull);
            });

            modelBuilder.Entity<IDNetAssignmentSubmit>(entity =>
            {
                entity.HasOne(sub => sub.Attempt)
                    .WithMany()
                    .HasForeignKey("AttemptId")
                    .OnDelete(DeleteBehavior.SetNull);
            });

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

            modelBuilder.Entity<AGTemplate>(entity =>
            {
                entity.ToTable("AGTemplates");
                entity.HasKey(t => t.Id);

                entity.Property(t => t.Name)
                      .IsRequired()
                      .HasMaxLength(100);

                entity.Property(t => t.AGName)
                      .HasMaxLength(100);

                entity.Property(t => t.AGDescription)
                      .HasMaxLength(500);

                entity.Property(t => t.Type)
                      .HasConversion<string>()
                      .IsRequired();

                entity.Property(t => t.IpCat)
                      .HasConversion<string>()
                      .IsRequired();

                entity.Property(t => t.Difficulty)
                      .HasConversion<string>();

                entity.Property(t => t.HostSortStrategy)
                      .HasConversion<string>();

                entity.HasOne(t => t.Owner)
                      .WithMany()
                      .HasForeignKey(t => t.OwnerId)
                      .OnDelete(DeleteBehavior.Cascade);
            });
        }
    }
}