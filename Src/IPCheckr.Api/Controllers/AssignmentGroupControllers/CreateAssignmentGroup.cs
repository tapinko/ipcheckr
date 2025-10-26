using IPCheckr.Api.DTOs;
using IPCheckr.Api.DTOs.AssignmentGroup;
using IPCheckr.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using IPCheckr.Api.Common.Enums;

namespace IPCheckr.Api.Controllers
{
    public partial class AssignmentGroupController : ControllerBase
    {
        [HttpPost("create-assignment-group")]
        [ProducesResponseType(typeof(CreateAssignmentGroupRes), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<CreateAssignmentGroupRes>> CreateAssignmentGroup([FromBody] CreateAssignmentGroupReq req)
        {
            var callerId = int.Parse(User.Claims.First(c => c.Type == System.Security.Claims.ClaimTypes.NameIdentifier).Value);

            var classObj = await _db.Classes
                .Include(c => c.Teachers)
                .Include(c => c.Students)
                .FirstOrDefaultAsync(c => c.Id == req.ClassId);

            if (classObj == null || classObj.Teachers == null || !classObj.Teachers.Any(t => t.Id == callerId))
                return StatusCode(StatusCodes.Status403Forbidden, new ApiProblemDetails
                {
                    Title = "Forbidden",
                    Detail = "You do not have permission to create an assignment group in this class.",
                    Status = StatusCodes.Status403Forbidden,
                    MessageEn = "You do not have permission to create an assignment group in this class.",
                    MessageSk = "Nemáte oprávnenie vytvárať skupiny úloh v tejto triede."
                });

            var assignmentGroup = new AssignmentGroup
            {
                Name = req.AssignmentGroupName,
                Description = req.Description,
                NumberOfRecords = req.NumberOfRecords,
                PossibleAttempts = req.PossibleAttempts,
                Class = classObj,
                StartDate = req.StartDate,
                Deadline = req.Deadline,
                AssignmentIpCat = req.AssignmentIpCat
            };
            _db.AssignmentGroups.Add(assignmentGroup);
            await _db.SaveChangesAsync();

            var studentIds = classObj.Students?.Select(s => s.Id).ToArray() ?? Array.Empty<int>();
            var students = await _db.Users
                .Where(u => studentIds.Contains(u.Id))
                .ToDictionaryAsync(u => u.Id, u => u);

            foreach (var studentId in studentIds)
            {
                if (!students.TryGetValue(studentId, out var studentUser))
                    continue;

                var assignmentData = TryGenerateAssignmentData(req.NumberOfRecords, req.AssignmentIpCat);
                if (assignmentData == null)
                    return StatusCode(StatusCodes.Status500InternalServerError, new ApiProblemDetails
                    {
                        Title = "Internal Server Error",
                        Detail = "Failed to generate assignment data.",
                        Status = StatusCodes.Status500InternalServerError,
                        MessageEn = "Failed to generate assignment data.",
                        MessageSk = "Nepodarilo sa vygenerovať údaje pre zadanie."
                    });

                var (cidr, hosts) = assignmentData.Value;

                var assignment = new Assignment
                {
                    AssignmentGroup = assignmentGroup,
                    Student = studentUser,
                    Cidr = cidr,
                    Hosts = hosts,
                    IsCompleted = false
                };
                _db.Assignments.Add(assignment);
                await _db.SaveChangesAsync();

                var answerKey = CalculateSubnettingAnswerKey(cidr, hosts);
                var answerKeyEntity = new AssignmentAnswerKey
                {
                    Assignment = assignment,
                    Networks = answerKey.Networks,
                    FirstUsables = answerKey.FirstUsables,
                    LastUsables = answerKey.LastUsables,
                    Broadcasts = answerKey.Broadcasts
                };
                _db.AssignmentAnswerKeys.Add(answerKeyEntity);
                await _db.SaveChangesAsync();
            }

            return Ok(new CreateAssignmentGroupRes { AssignmentGroupId = assignmentGroup.Id });
        }

        private (string cidr, int[] hosts)? TryGenerateAssignmentData(
            int numberOfRecords, AssignmentGroupIpCat ipCat, int maxAttempts = 1000)
        {
            int attempts = ipCat == AssignmentGroupIpCat.LOCAL ? Math.Max(maxAttempts, 5000) : maxAttempts;
            for (int attempt = 0; attempt < attempts; attempt++)
            {
                var rand = new Random(Guid.NewGuid().GetHashCode() ^ Environment.TickCount ^ attempt);
                int prefix = rand.Next(16, 29);

                uint ipUint = GenerateRandomIpUint(rand, ipCat);
                if (!IsIpAllowedByCategory(ipUint, ipCat))
                    continue;

                uint mask = PrefixToMask(prefix);
                uint networkIpUint = ipUint & mask;
                var cidr = $"{UintToIp(networkIpUint)}/{prefix}";

                var hosts = Enumerable.Range(0, numberOfRecords)
                    .Select(_ => rand.Next(2, 254))
                    .OrderByDescending(h => h)
                    .ToArray();

                int totalNeeded = hosts.Select(h => h + 2).Sum();
                int available = 1 << (32 - prefix);
                if (totalNeeded <= available)
                    return (cidr, hosts);
            }
            return null;
        }

        private static uint PrefixToMask(int prefix)
        {
            return prefix == 0 ? 0u : 0xFFFFFFFFu << (32 - prefix);
        }

        private static uint GenerateRandomIpUint(Random rand, AssignmentGroupIpCat cat)
        {
            int a, b, c;
            switch (cat)
            {
                case AssignmentGroupIpCat.LOCAL:
                    int choice = rand.Next(0, 3);
                    if (choice == 0)
                    {
                        a = 10;
                        b = rand.Next(0, 256);
                        c = rand.Next(0, 256);
                    }
                    else if (choice == 1)
                    {
                        a = 172;
                        b = rand.Next(16, 32);
                        c = rand.Next(0, 256);
                    }
                    else
                    {
                        a = 192;
                        b = 168;
                        c = rand.Next(0, 256);
                    }
                    break;
                case AssignmentGroupIpCat.ABC:
                    while (true)
                    {
                        a = rand.Next(1, 224);
                        if (a == 127) continue;
                        if (a == 10) continue;
                        if (a == 192)
                        {
                            b = rand.Next(0, 256);
                            if (b == 168) continue;
                        }
                        else if (a == 172)
                        {
                            b = rand.Next(0, 256);
                            if (b >= 16 && b <= 31) continue;
                        }
                        else if (a == 169)
                        {
                            b = rand.Next(0, 256);
                            if (b == 254) continue;
                        }
                        else
                        {
                            b = rand.Next(0, 256);
                        }
                        c = rand.Next(0, 256);
                        break;
                    }
                    break;
                case AssignmentGroupIpCat.ALL:
                default:
                    a = rand.Next(1, 224);
                    if (a == 127) a = 126;
                    b = rand.Next(0, 256);
                    c = rand.Next(0, 256);
                    break;
            }
            var d = 0;
            return (uint)(a << 24 | b << 16 | c << 8 | d);
        }

        private static bool IsIpAllowedByCategory(uint ip, AssignmentGroupIpCat cat)
        {
            int a = (int)((ip >> 24) & 0xFF);
            int b = (int)((ip >> 16) & 0xFF);
            int c = (int)((ip >> 8) & 0xFF);

            bool isClassABC = a >= 1 && a <= 223 && a != 127;
            bool isPrivate =
                a == 10 ||
                (a == 172 && b >= 16 && b <= 31) ||
                (a == 192 && b == 168);
            bool isLinkLocal = a == 169 && b == 254;

            switch (cat)
            {
                case AssignmentGroupIpCat.LOCAL:
                    return isPrivate;
                case AssignmentGroupIpCat.ABC:
                    return isClassABC && !isPrivate && !isLinkLocal;
                case AssignmentGroupIpCat.ALL:
                default:
                    return isClassABC;
            }
        }

        private (string[] Networks, string[] FirstUsables, string[] LastUsables, string[] Broadcasts) CalculateSubnettingAnswerKey(string cidr, int[] hosts)
        {
            var ipParts = cidr.Split("/");
            var baseIp = ipParts[0];
            int prefix = int.Parse(ipParts[1]);
            uint ipInt = IpToUint(baseIp);

            var results = new List<(string net, string first, string last, string broadcast)>();
            foreach (var h in hosts)
            {
                int needed = h + 2;
                int subnetBits = 32 - (int)Math.Ceiling(Math.Log(needed, 2));
                int subnetSize = 1 << (32 - subnetBits);

                var netIp = ipInt;
                var firstIp = netIp + 1;
                var lastIp = netIp + (uint)(subnetSize - 2);
                var broadcastIp = netIp + (uint)(subnetSize - 1);

                results.Add((
                    $"{UintToIp(netIp)}/{subnetBits}",
                    UintToIp(firstIp),
                    UintToIp(lastIp),
                    UintToIp(broadcastIp)
                ));

                ipInt += (uint)subnetSize;
            }

            return (
                results.Select(r => r.net).ToArray(),
                results.Select(r => r.first).ToArray(),
                results.Select(r => r.last).ToArray(),
                results.Select(r => r.broadcast).ToArray()
            );
        }

        private uint IpToUint(string ip)
        {
            var parts = ip.Split(".").Select(byte.Parse).ToArray();
            return (uint)(parts[0] << 24 | parts[1] << 16 | parts[2] << 8 | parts[3]);
        }

        private string UintToIp(uint ip)
        {
            return $"{(ip >> 24) & 0xFF}.{(ip >> 16) & 0xFF}.{(ip >> 8) & 0xFF}.{ip & 0xFF}";
        }
    }
}