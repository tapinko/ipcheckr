using IPCheckr.Api.Common.Constants;
using IPCheckr.Api.DTOs;
using IPCheckr.Api.DTOs.AssignmentGroup;
using IPCheckr.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using IPCheckr.Api.Common.Enums;
using IPCheckr.Api.Common.Utils;

namespace IPCheckr.Api.Controllers
{
    public partial class AssignmentGroupController : ControllerBase
    {
        [HttpPost("create-subnet-assignment-group")]
        [Authorize(Policy = Roles.Teacher)]
        [ProducesResponseType(typeof(CreateSubnetAGRes), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<CreateSubnetAGRes>> CreateSubnetAssignmentGroup([FromBody] CreateSubnetAGReq req)
        {
            var callerId = int.Parse(User.Claims.First(c => c.Type == System.Security.Claims.ClaimTypes.NameIdentifier).Value);

            if (req.Type != AssignmentGroupType.SUBNET)
                return BadRequest(new ApiProblemDetails
                {
                    Title = "Bad Request",
                    Detail = "Type must be SUBNET for this endpoint.",
                    Status = StatusCodes.Status400BadRequest,
                    MessageEn = "Type must be SUBNET for this endpoint.",
                    MessageSk = "Typ musí byť SUBNET pre tento endpoint."
                });

            if (req.NumberOfRecords < 1 || req.NumberOfRecords > 12)
                return BadRequest(new ApiProblemDetails
                {
                    Title = "Bad Request",
                    Detail = "NumberOfRecords must be between 1 and 12.",
                    Status = StatusCodes.Status400BadRequest,
                    MessageEn = "NumberOfRecords must be between 1 and 12.",
                    MessageSk = "NumberOfRecords musí byť medzi 1 a 12."
                });

            var classObj = await _db.Classes
                .Include(c => c.Teachers)
                .Include(c => c.Students)
                .FirstOrDefaultAsync(c => c.Id == req.ClassId);

            if (!User.IsInRole(Roles.Admin) && (classObj == null || classObj.Teachers == null || !classObj.Teachers.Any(t => t.Id == callerId)))
                return StatusCode(StatusCodes.Status403Forbidden, new ApiProblemDetails
                {
                    Title = "Forbidden",
                    Detail = "You do not have permission to create an assignment group in this class.",
                    Status = StatusCodes.Status403Forbidden,
                    MessageEn = "You do not have permission to create an assignment group in this class.",
                    MessageSk = "Nemáte oprávnenie vytvárať skupiny zadania v tejto triede."
                });

            var targetStudents = (req.Students?.Length ?? 0) > 0
                ? classObj.Students?.Where(s => req.Students!.Contains(s.Id)).ToList() ?? new List<User>()
                : classObj.Students?.ToList() ?? new List<User>();

            if (targetStudents.Count == 0)
            {
                return BadRequest(new ApiProblemDetails
                {
                    Title = "Bad Request",
                    Detail = "No students found for the assignment group.",
                    Status = StatusCodes.Status400BadRequest,
                    MessageEn = "No students found for the assignment group.",
                    MessageSk = "Pre skupinu zadaní neboli nájdení žiadni študenti."
                });
            }

            var initialStatus = AssignmentEvaluationUtils.ResolveStatus(req.StartDate, req.Deadline, null);
            var resolvedSubnetDifficulty = req.Difficulty ?? ResolveSubnetDifficulty(req.NumberOfRecords);

            var subnetGroup = new SubnetAG
            {
                Name = req.Name,
                Description = req.Description,
                NumberOfRecords = req.NumberOfRecords,
                AssignmentIpCat = req.IpCat,
                Difficulty = resolvedSubnetDifficulty,
                HostSortStrategy = req.HostSortStrategy ?? AssignmentGroupHostSortStrategy.DESCENDING,
                Class = classObj,
                StartDate = req.StartDate,
                Deadline = req.Deadline,
                Status = initialStatus
            };

            _db.SubnetAGs.Add(subnetGroup);
            await _db.SaveChangesAsync();

            var subnetAssignments = new List<SubnetAssignment>();
            var subnetAnswerKeys = new List<SubnetAssignmentAnswerKey>();

            foreach (var student in targetStudents)
            {
                var assignmentData = TryGenerateAssignmentData(
                    req.NumberOfRecords,
                    req.IpCat,
                    subnetGroup.HostSortStrategy,
                    resolvedSubnetDifficulty
                );
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
                var answerKey = CalculateSubnettingAnswerKey(cidr, hosts);

                var assignment = new SubnetAssignment
                {
                    AssignmentGroup = subnetGroup,
                    Student = student,
                    Cidr = cidr,
                    Hosts = hosts
                };

                subnetAssignments.Add(assignment);
                subnetAnswerKeys.Add(new SubnetAssignmentAnswerKey
                {
                    Assignment = assignment,
                    Networks = answerKey.Networks,
                    FirstUsables = answerKey.FirstUsables,
                    LastUsables = answerKey.LastUsables,
                    Broadcasts = answerKey.Broadcasts
                });
            }

            _db.SubnetAssignments.AddRange(subnetAssignments);
            _db.SubnetAssignmentAnswerKeys.AddRange(subnetAnswerKeys);
            await _db.SaveChangesAsync();

            return Ok(new CreateSubnetAGRes { AssignmentGroupId = subnetGroup.Id });
        }

        [HttpPost("create-idnet-assignment-group")]
        [Authorize(Policy = Roles.Teacher)]
        [ProducesResponseType(typeof(CreateIDNetAGRes), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(ApiProblemDetails), StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<CreateIDNetAGRes>> CreateIdNetAssignmentGroup([FromBody] CreateIDNetAGReq req)
        {
            var callerId = int.Parse(User.Claims.First(c => c.Type == System.Security.Claims.ClaimTypes.NameIdentifier).Value);

            if (req.Type != AssignmentGroupType.IDNET)
                return BadRequest(new ApiProblemDetails
                {
                    Title = "Bad Request",
                    Detail = "Type must be IDNET for this endpoint.",
                    Status = StatusCodes.Status400BadRequest,
                    MessageEn = "Type must be IDNET for this endpoint.",
                    MessageSk = "Typ musí byť IDNET pre tento endpoint."
                });

            if (req.NumberOfRecords < 1 || req.NumberOfRecords > 12)
                return BadRequest(new ApiProblemDetails
                {
                    Title = "Bad Request",
                    Detail = "NumberOfRecords must be between 1 and 12.",
                    Status = StatusCodes.Status400BadRequest,
                    MessageEn = "NumberOfRecords must be between 1 and 12.",
                    MessageSk = "NumberOfRecords musí byť medzi 1 a 12."
                });

            if (!req.PossibleOctets.HasValue)
            {
                return BadRequest(new ApiProblemDetails
                {
                    Title = "Bad Request",
                    Detail = "PossibleOctets is required for IDNet assignments.",
                    Status = StatusCodes.Status400BadRequest,
                    MessageEn = "PossibleOctets is required for IDNet assignments.",
                    MessageSk = "PossibleOctets je povinný pre IDNet zadania."
                });
            }

            var classObj = await _db.Classes
                .Include(c => c.Teachers)
                .Include(c => c.Students)
                .FirstOrDefaultAsync(c => c.Id == req.ClassId);

            if (!User.IsInRole(Roles.Admin) && (classObj == null || classObj.Teachers == null || !classObj.Teachers.Any(t => t.Id == callerId)))
                return StatusCode(StatusCodes.Status403Forbidden, new ApiProblemDetails
                {
                    Title = "Forbidden",
                    Detail = "You do not have permission to create an assignment group in this class.",
                    Status = StatusCodes.Status403Forbidden,
                    MessageEn = "You do not have permission to create an assignment group in this class.",
                    MessageSk = "Nemáte oprávnenie vytvárať skupiny zadaní v tejto triede."
                });

            var targetStudents = (req.Students?.Length ?? 0) > 0
                ? classObj.Students?.Where(s => req.Students!.Contains(s.Id)).ToList() ?? new List<User>()
                : classObj.Students?.ToList() ?? new List<User>();

            if (targetStudents.Count == 0)
            {
                return BadRequest(new ApiProblemDetails
                {
                    Title = "Bad Request",
                    Detail = "No students found for the assignment group.",
                    Status = StatusCodes.Status400BadRequest,
                    MessageEn = "No students found for the assignment group.",
                    MessageSk = "Pre skupinu zadaní neboli nájdení žiadni študenti."
                });
            }

            var initialStatus = AssignmentEvaluationUtils.ResolveStatus(req.StartDate, req.Deadline, null);

            var idnetGroup = new IDNetAG
            {
                Name = req.Name,
                Description = req.Description,
                NumberOfRecords = req.NumberOfRecords,
                AssignmentIpCat = req.IpCat,
                PossibleOctets = req.PossibleOctets.Value,
                TestWildcard = req.TestWildcard,
                TestFirstLastBr = req.TestFirstLastBr,
                Difficulty = null,
                Class = classObj,
                StartDate = req.StartDate,
                Deadline = req.Deadline,
                Status = initialStatus
            };

            _db.IDNetAGs.Add(idnetGroup);
            await _db.SaveChangesAsync();

            var idnetAssignments = new List<IDNetAssignment>();
            var idnetAnswerKeys = new List<IDNetAssignmentAnswerKey>();

            foreach (var student in targetStudents)
            {
                var data = GenerateIdNetAssignmentData(req.NumberOfRecords, req.IpCat, idnetGroup.PossibleOctets);

                var assignment = new IDNetAssignment
                {
                    AssignmentGroup = idnetGroup,
                    Student = student,
                    Addresses = data.Cidrs
                };

                idnetAssignments.Add(assignment);
                idnetAnswerKeys.Add(new IDNetAssignmentAnswerKey
                {
                    Assignment = assignment,
                    IDNet = data.Networks,
                    Wildcards = data.Wildcards,
                    FirstUsables = data.FirstUsables,
                    LastUsables = data.LastUsables,
                    Broadcasts = data.Broadcasts
                });
            }

            _db.IDNetAssignments.AddRange(idnetAssignments);
            _db.IDNetAssignmentAnswerKeys.AddRange(idnetAnswerKeys);
            await _db.SaveChangesAsync();

            return Ok(new CreateIDNetAGRes { AssignmentGroupId = idnetGroup.Id });
        }

        private (string cidr, int[] hosts)? TryGenerateAssignmentData(
            int numberOfRecords,
            AssignmentGroupIpCat ipCat,
            AssignmentGroupHostSortStrategy? hostSortStrategy,
            AssignmentGroupDifficulty? difficulty,
            int maxAttempts = 1000
        )
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

                var resolvedDifficulty = difficulty ?? AssignmentGroupDifficulty.MEDIUM;
                var hosts = PickUniqueHostCounts(rand, resolvedDifficulty, numberOfRecords);

                hosts = ApplyHostSortStrategy(hosts, hostSortStrategy);

                int totalNeeded = hosts.Select(h => h + 2).Sum();
                int available = 1 << (32 - prefix);
                if (totalNeeded <= available)
                    return (cidr, hosts);
            }
            return null;
        }

        private static int[] PickUniqueHostCounts(Random rand, AssignmentGroupDifficulty difficulty, int count)
        {
            var (minHosts, maxHosts) = ResolveHostsRangeByDifficulty(difficulty);
            var candidates = Enumerable.Range(minHosts, maxHosts - minHosts + 1).ToList();
            for (int i = candidates.Count - 1; i > 0; i--)
            {
                int j = rand.Next(i + 1);
                (candidates[i], candidates[j]) = (candidates[j], candidates[i]);
            }
            return candidates.Take(count).ToArray();
        }

        private (string[] Networks, string[] FirstUsables, string[] LastUsables, string[] Broadcasts) CalculateSubnettingAnswerKey(string cidr, int[] hosts)
        {
            var ipParts = cidr.Split("/");
            var baseIp = ipParts[0];
            int prefix = int.Parse(ipParts[1]);
            uint ipInt = IpToUint(baseIp);

            // VLSM: always allocate from largest to smallest subnet to ensure correct address alignment,
            // then restore results to the original display order.
            var indexed = hosts.Select((h, i) => (h, originalIndex: i)).OrderByDescending(x => x.h).ToArray();
            var results = new (string net, string first, string last, string broadcast)[hosts.Length];

            foreach (var (h, originalIndex) in indexed)
            {
                int needed = h + 2;
                int subnetBits = 32 - (int)Math.Ceiling(Math.Log(needed, 2));
                int subnetSize = 1 << (32 - subnetBits);

                var netIp = ipInt;
                var firstIp = subnetBits >= 31 ? netIp : netIp + 1;
                var lastIp = subnetBits >= 31 ? netIp : netIp + (uint)(subnetSize - 2);
                var broadcastIp = netIp + (uint)(subnetSize - 1);

                results[originalIndex] = (
                    $"{UintToIp(netIp)}/{subnetBits}",
                    UintToIp(firstIp),
                    UintToIp(lastIp),
                    UintToIp(broadcastIp)
                );

                ipInt += (uint)subnetSize;
            }

            return (
                results.Select(r => r.net).ToArray(),
                results.Select(r => r.first).ToArray(),
                results.Select(r => r.last).ToArray(),
                results.Select(r => r.broadcast).ToArray()
            );
        }

        private static int[] ApplyHostSortStrategy(int[] hosts, AssignmentGroupHostSortStrategy? hostSortStrategy)
        {
            var resolvedStrategy = ResolveHostSortStrategy(hostSortStrategy);

            return resolvedStrategy switch
            {
                AssignmentGroupHostSortStrategy.RANDOM => hosts,
                AssignmentGroupHostSortStrategy.ASCENDING => hosts.OrderBy(h => h).ToArray(),
                _ => hosts.OrderByDescending(h => h).ToArray()
            };
        }

        private static AssignmentGroupHostSortStrategy ResolveHostSortStrategy(AssignmentGroupHostSortStrategy? strategy)
        {
            return strategy ?? AssignmentGroupHostSortStrategy.DESCENDING;
        }

        private static AssignmentGroupDifficulty ResolveSubnetDifficulty(int numberOfRecords)
        {
            return numberOfRecords switch
            {
                <= 4 => AssignmentGroupDifficulty.EASY,
                <= 8 => AssignmentGroupDifficulty.MEDIUM,
                _ => AssignmentGroupDifficulty.HARD
            };
        }

        private static (int minHosts, int maxHosts) ResolveHostsRangeByDifficulty(AssignmentGroupDifficulty? difficulty)
        {
            var resolvedDifficulty = difficulty ?? AssignmentGroupDifficulty.MEDIUM;

            return resolvedDifficulty switch
            {
                AssignmentGroupDifficulty.EASY => (96, 253),
                AssignmentGroupDifficulty.HARD => (2, 48),
                _ => (32, 160)
            };
        }

        private (string[] Cidrs, string[] Networks, string[] Wildcards, string[] FirstUsables, string[] LastUsables, string[] Broadcasts) GenerateIdNetAssignmentData(
            int numberOfRecords, AssignmentGroupIpCat ipCat, int possibleOctets)
        {
            var rand = new Random(Guid.NewGuid().GetHashCode());
            var cidrs = new List<string>();
            var networks = new List<string>();
            var wildcards = new List<string>();
            var firstUsables = new List<string>();
            var lastUsables = new List<string>();
            var broadcasts = new List<string>();

            var normalizedPossibleOctets = Math.Clamp(possibleOctets, 1, 4);
            int minPrefix = Math.Max(1, (normalizedPossibleOctets - 1) * 8);
            int maxPrefix = 30;

            for (int i = 0; i < numberOfRecords; i++)
            {
                int prefix = rand.Next(minPrefix, maxPrefix + 1);
                uint mask = PrefixToMask(prefix);
                uint wildcard = ~mask;
                uint ipUint;
                uint network;
                uint broadcast;

                do {
                    ipUint = GenerateRandomHostIpUint(rand, ipCat);
                    network = ipUint & mask;
                    broadcast = network | wildcard;
                } while (ipUint == network || ipUint == broadcast);

                var first = prefix >= 31 ? network : network + 1;
                var last = prefix >= 31 ? broadcast : broadcast - 1;

                cidrs.Add($"{UintToIp(ipUint)}/{prefix}");
                networks.Add(UintToIp(network));
                wildcards.Add(UintToIp(wildcard));
                firstUsables.Add(UintToIp(first));
                lastUsables.Add(UintToIp(last));
                broadcasts.Add(UintToIp(broadcast));
            }

            return (cidrs.ToArray(), networks.ToArray(), wildcards.ToArray(), firstUsables.ToArray(), lastUsables.ToArray(), broadcasts.ToArray());
        }

        private static uint GenerateRandomHostIpUint(Random rand, AssignmentGroupIpCat cat)
        {
            var baseIp = GenerateRandomIpUint(rand, cat);
            var hostOctet = rand.Next(1, 255);
            return (baseIp & 0xFFFFFF00u) | (uint)hostOctet;
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

            return cat switch
            {
                AssignmentGroupIpCat.LOCAL => isPrivate,
                AssignmentGroupIpCat.ABC => isClassABC && !isPrivate && !isLinkLocal,
                _ => isClassABC
            };
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